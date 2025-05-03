import torch
import torch.nn as nn
import timm
import numpy as np
import cv2
from PIL import Image
import io
import base64
import os
import json
from albumentations import Compose, Normalize, Resize
from albumentations.pytorch import ToTensorV2
import random

def set_seed(seed=42):
    """Set random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False

class EfficientNetModel(nn.Module):
    def __init__(self, num_classes=5):
        """
        Initialize EfficientNet model with custom classifier.
        
        Args:
            num_classes (int): Number of classification categories
        """
        super().__init__()
        self.model = timm.create_model('efficientnet_b0', pretrained=False)
        in_features = self.model.classifier.in_features
        
        # Custom multi-layer classifier
        self.model.classifier = nn.Sequential(
            nn.Linear(in_features, 1024),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(1024, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        """Forward pass through the model."""
        return self.model(x)

def load_models(model_paths, num_classes, device):
    """
    Load multiple pre-trained models.
    
    Args:
        model_paths (list): Paths to model weights
        num_classes (int): Number of output classes
        device (torch.device): Device to load models on
    
    Returns:
        list: Loaded and prepared models
    """
    models = []
    for model_path in model_paths:
        model = EfficientNetModel(num_classes=num_classes).to(device)
        state_dict = torch.load(model_path, map_location=device)
        model.load_state_dict(state_dict)
        model.eval()
        models.append(model)
    return models

def preprocess_image_file(image_file, image_size=384):
    """
    Preprocess input image for model inference.
    
    Args:
        image_file: File object or path
        image_size (int): Resize dimension
    
    Returns:
        torch.Tensor: Preprocessed image tensor
    """
    # Handle different input types (file path, bytes, file object)
    if isinstance(image_file, str):
        img = cv2.imread(image_file)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    elif isinstance(image_file, bytes):
        nparr = np.frombuffer(image_file, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    else:
        # Assume file-like object
        img_bytes = image_file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    if img is None:
        raise ValueError("Could not process the image")
    
    transforms = Compose([
        Resize(image_size, image_size),
        Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ToTensorV2(),
    ])
    transformed = transforms(image=img)
    return transformed['image'].unsqueeze(0), img

def preprocess_base64_image(base64_string, image_size=384):
    """
    Preprocess base64 encoded image for model inference.
    
    Args:
        base64_string (str): Base64 encoded image string
        image_size (int): Resize dimension
    
    Returns:
        torch.Tensor: Preprocessed image tensor
    """
    # Decode base64 image
    if ',' in base64_string:
        # Handle data URL format (e.g., "data:image/jpeg;base64,...")
        base64_string = base64_string.split(',')[1]
    
    img_bytes = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    if img is None:
        raise ValueError("Could not decode the base64 image")
    
    transforms = Compose([
        Resize(image_size, image_size),
        Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ToTensorV2(),
    ])
    transformed = transforms(image=img)
    return transformed['image'].unsqueeze(0), img

def predict_with_models(models, image_tensor, device):
    """
    Perform inference with multiple models.
    
    Args:
        models (list): List of trained models
        image_tensor (torch.Tensor): Input image tensor
        device (torch.device): Computation device
    
    Returns:
        dict: Aggregated predictions and individual model results
    """
    predictions = []
    image_tensor = image_tensor.to(device)
    
    class_votes = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
    total_confidence = {0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0}
    
    for i, model in enumerate(models, 1):
        with torch.no_grad():
            outputs = model(image_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            predicted_class = probabilities.argmax(dim=1).item()
            confidence = probabilities.max(dim=1).values.item()
            
            # Store individual model prediction
            model_result = {
                "model_id": i,
                "predicted_class": int(predicted_class),
                "confidence": float(confidence),
                "probabilities": probabilities.cpu().numpy()[0].tolist()
            }
            predictions.append(model_result)
            
            # Update votes and confidence
            class_votes[predicted_class] += 1
            for cls in range(5):
                total_confidence[cls] += float(probabilities[0][cls])
    
    # Calculate ensemble prediction (majority voting)
    max_votes = max(class_votes.values())
    ensemble_classes = [cls for cls, votes in class_votes.items() if votes == max_votes]
    
    if len(ensemble_classes) == 1:
        # Clear winner
        ensemble_prediction = ensemble_classes[0]
    else:
        # Tie-breaking using average confidence
        ensemble_prediction = max(ensemble_classes, key=lambda cls: total_confidence[cls])
    
    ensemble_confidence = total_confidence[ensemble_prediction] / len(models)
    
    # Create result
    class_labels = {
        0: "No DR",
        1: "Mild",
        2: "Moderate", 
        3: "Severe",
        4: "Proliferative DR"
    }
    
    result = {
        "prediction": {
            "class_id": ensemble_prediction,
            "class_name": class_labels[ensemble_prediction],
            "confidence": float(ensemble_confidence),
            "avg_probabilities": [float(total_confidence[i]/len(models)) for i in range(5)]
        },
        "individual_models": predictions,
        "class_labels": class_labels
    }
    
    return result

def analyze_retina_image(image_data, model_dir="models"):
    """
    Analyze retina image for diabetic retinopathy.
    
    Args:
        image_data: Can be file path, file object, bytes, or base64 string
        model_dir (str): Directory containing model weights
    
    Returns:
        dict: Analysis results
    """
    set_seed(42)
    
    # Check model directory exists
    if not os.path.exists(model_dir):
        raise FileNotFoundError(f"Model directory {model_dir} not found")
    
    # Find model files in directory
    model_paths = []
    for file in os.listdir(model_dir):
        if file.endswith('.pth'):
            model_paths.append(os.path.join(model_dir, file))
    
    if not model_paths:
        raise FileNotFoundError(f"No model files (.pth) found in {model_dir}")
    
    class_labels = {
        0: "No DR",
        1: "Mild",
        2: "Moderate", 
        3: "Severe",
        4: "Proliferative DR"
    }
    
    # Device and Model Setup
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    models = load_models(model_paths, num_classes=len(class_labels), device=device)
    
    # Process the image based on input type
    if isinstance(image_data, str):
        if os.path.isfile(image_data):
            # It's a file path
            image_tensor, original_img = preprocess_image_file(image_data)
        else:
            # Assume it's a base64 string
            image_tensor, original_img = preprocess_base64_image(image_data)
    elif isinstance(image_data, bytes):
        # Raw image bytes
        image_tensor, original_img = preprocess_image_file(image_data)
    else:
        # Assume file-like object
        image_tensor, original_img = preprocess_image_file(image_data)
    
    # Run inference
    results = predict_with_models(models, image_tensor, device)
    
    return results

# CLI interface if run directly
if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Analyze retina image for diabetic retinopathy')
    parser.add_argument('image_path', help='Path to the retina scan image')
    parser.add_argument('--model_dir', default='models', help='Directory containing model weights')
    
    args = parser.parse_args()
    
    try:
        results = analyze_retina_image(args.image_path, args.model_dir)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(f"Error analyzing image: {str(e)}", file=sys.stderr)
        sys.exit(1)