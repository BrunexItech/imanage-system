
from django.db import models
from django.utils import timezone

# Payment methods supported
class PaymentMethod(models.Model):
    METHOD_TYPES = (
        ('cash', 'Cash'),
        ('mobile_money', 'Mobile Money'),
        ('card', 'Credit/Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
    )
    
    MOBILE_MONEY_PROVIDERS = (
        ('mpesa', 'M-Pesa'),
        ('airtel_money', 'Airtel Money'),
        ('mtn_momo', 'MTN MoMo'),
        ('orange_money', 'Orange Money'),
    )
    
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    method_type = models.CharField(max_length=20, choices=METHOD_TYPES)
    provider = models.CharField(max_length=20, choices=MOBILE_MONEY_PROVIDERS, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Mobile money specific fields
    merchant_code = models.CharField(max_length=100, blank=True)  # Till number/merchant ID
    api_key = models.CharField(max_length=200, blank=True)  # Encrypted in production
    api_secret = models.CharField(max_length=200, blank=True)  # Encrypted in production
    
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"{self.name} ({self.get_method_type_display()})"

# Payment transactions
class Payment(models.Model):
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    
    # References
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    sale = models.ForeignKey('sales.Sale', on_delete=models.CASCADE, related_name='payments')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True)
    
    # Payment details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)  # amount - fee
    
    # Mobile money transaction IDs
    provider_transaction_id = models.CharField(max_length=100, blank=True)  # From M-Pesa etc.
    customer_phone = models.CharField(max_length=20, blank=True)  # Customer phone for mobile money
    
    # Status
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    is_offline = models.BooleanField(default=False)  # Created offline
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} - {self.amount}"
    
    # Auto-calculate net amount
    def save(self, *args, **kwargs):
        self.net_amount = self.amount - self.transaction_fee
        super().save(*args, **kwargs)

# Expense tracking
class Expense(models.Model):
    CATEGORIES = (
        ('rent', 'Rent'),
        ('salaries', 'Salaries'),
        ('utilities', 'Utilities'),
        ('inventory', 'Inventory Purchase'),
        ('maintenance', 'Maintenance'),
        ('marketing', 'Marketing'),
        ('other', 'Other'),
    )
    
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Payment info
    paid_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Receipt/document
    receipt_number = models.CharField(max_length=100, blank=True)
    receipt_image = models.ImageField(upload_to='expenses/', blank=True, null=True)  # Configure media in settings
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_category_display()} - {self.amount}"