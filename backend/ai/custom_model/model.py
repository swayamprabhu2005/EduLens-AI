import torch
import torch.nn as nn

class MultiTaskEngagementCNN(nn.Module):
    def __init__(self, num_engagement_classes=4, num_emotion_classes=8):
        """
        Multi-Task CNN for classifying both Engagement (DAiSEE) and Emotion (AffectNet).
        Expected input shape: (Batch_Size, 3, 224, 224)
        """
        super(MultiTaskEngagementCNN, self).__init__()
        
        # Shared Feature Extractor (Learns general facial features from both datasets)
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2), # Output: 112x112
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2), # Output: 56x56
            
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2), # Output: 28x28
            
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2, 2), # Output: 14x14
        )
        
        # Head 1: Engagement Classifier (For DAiSEE)
        self.engagement_head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256 * 14 * 14, 512),
            nn.ReLU(),
            nn.Dropout(0.5), # Prevent overfitting
            nn.Linear(512, num_engagement_classes)
        )

        # Head 2: Emotion Classifier (For AffectNet)
        self.emotion_head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256 * 14 * 14, 512),
            nn.ReLU(),
            nn.Dropout(0.5), # Prevent overfitting
            nn.Linear(512, num_emotion_classes)
        )
        
    def forward(self, x):
        shared_features = self.features(x)
        # Output both predictions
        engagement_out = self.engagement_head(shared_features)
        emotion_out = self.emotion_head(shared_features)
        return engagement_out, emotion_out

# Example usage/test
if __name__ == "__main__":
    model = MultiTaskEngagementCNN(num_engagement_classes=4, num_emotion_classes=8)
    dummy_input = torch.randn(1, 3, 224, 224)
    eng_out, emo_out = model(dummy_input)
    print(f"Engagement output shape: {eng_out.shape}") # Should be [1, 4]
    print(f"Emotion output shape: {emo_out.shape}") # Should be [1, 8]
