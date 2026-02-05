from django.db import models
from django.utils import timezone

# Main business/organization model (single tenant)
class Business(models.Model):
    # Business status choices
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('closed', 'Closed'),
    )
    
    # Basic business info
    name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=100, blank=True)
    business_type = models.CharField(max_length=100, blank=True)
    
    # Contact information
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    country = models.CharField(max_length=100, default='Kenya')  # Default for African market
    
    # Business settings
    currency = models.CharField(max_length=10, default='KES')  # Kenyan Shilling
    timezone_field = models.CharField(max_length=50, default='Africa/Nairobi')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Tax and financial settings
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16.0)  # VAT percentage
    receipt_footer = models.TextField(blank=True)  # Custom text for receipts
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'Businesses'  # Proper plural in admin
    
    def __str__(self):
        return self.name
    
    # Property to check if business is active
    @property
    def is_active(self):
        return self.status == 'active'