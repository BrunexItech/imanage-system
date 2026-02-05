from django.contrib import admin
from .models import Business

@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'country', 'status', 'created_at')
    list_filter = ('status', 'country')
    search_fields = ('name', 'registration_number')