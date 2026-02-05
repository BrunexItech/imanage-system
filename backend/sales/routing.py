from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/sales/(?P<business_id>\w+)/$', consumers.SalesConsumer.as_asgi()),
]