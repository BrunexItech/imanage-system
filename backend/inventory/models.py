from django.db import models
from django.utils import timezone
import uuid  # For unique barcodes

# Product categories for organization
class Category(models.Model):
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name

# Main product model
class Product(models.Model):
    # Product status choices
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('discontinued', 'Discontinued'),
        ('out_of_stock', 'Out of Stock'),
    )
    
    # Basic product info
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    sku = models.CharField(max_length=50, unique=True)  # Stock Keeping Unit
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Pricing
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)  # Buying price
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)  # Selling price
    profit_margin = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    
    # Stock management
    current_stock = models.IntegerField(default=0)
    minimum_stock = models.IntegerField(default=10)  # Low stock threshold
    maximum_stock = models.IntegerField(default=1000)  # Max capacity
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Barcode/QR code
    barcode = models.CharField(max_length=100, unique=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.sku})"
    
    # Auto-calculate profit margin before saving
    def save(self, *args, **kwargs):
        if self.cost_price and self.selling_price and self.cost_price > 0:
            self.profit_margin = self.selling_price - self.cost_price
        else:
            self.profit_margin = 0
        super().save(*args, **kwargs)
    
    # Check if stock is low
    @property
    def is_low_stock(self):
        return self.current_stock <= self.minimum_stock
    
    # Check if out of stock
    @property
    def is_out_of_stock(self):
        return self.current_stock <= 0

# Stock movement tracking
class StockMovement(models.Model):
    MOVEMENT_TYPES = (
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
        ('adjustment', 'Adjustment'),
        ('return', 'Return'),
        ('damage', 'Damage'),
    )
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField()  # Positive for incoming, negative for outgoing
    previous_quantity = models.IntegerField()  # Stock before movement
    new_quantity = models.IntegerField()  # Stock after movement
    reference = models.CharField(max_length=100, blank=True)  # Sale ID or Purchase Order
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.product.name} - {self.movement_type} ({self.quantity})"