import os
import django
from django.core.asgi import get_asgi_application

# SET DJANGO_SETTINGS_MODULE FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'imanage.settings')

# Setup Django BEFORE importing apps
django.setup()

# Now import WebSocket routing
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from sales.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})