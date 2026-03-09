from .navigation.open_url import open_url
from .interaction.click_element import click_element
from .interaction.type_text import type_text
from .interaction.hover_element import hover_element
from .utility.wait_seconds import wait_seconds
from .utility.take_screenshot import take_screenshot
from .utility.wait_element import wait_element
from .assertions.verify_text import verify_text
from .assertions.verify_visibility import verify_visibility
from .logic.if_condition import if_condition

# Registry: ánh xạ tên action (từ JSON node) sang hàm Python tương ứng
ACTION_REGISTRY = {
    "open-url": open_url,
    "mouse-click": click_element,
    "type-text": type_text,
    "hover-element": hover_element,
    "wait-time": wait_seconds,
    "take-screenshot": take_screenshot,
    "wait-element": wait_element,
    "verify-text": verify_text,
    "verify-visibility": verify_visibility,
    "if-condition": if_condition,
}
