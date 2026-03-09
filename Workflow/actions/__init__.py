# Actions package init
from .navigation.open_url import open_url
from .interaction.click_element import click_element
from .interaction.type_text import type_text
from .utility.wait_seconds import wait_seconds

# Registry: ánh xạ tên action (từ JSON node) sang hàm Python tương ứng
ACTION_REGISTRY = {
    "open-url": open_url,
    "mouse-click": click_element,
    "type-text": type_text,
    "wait-time": wait_seconds,
}
