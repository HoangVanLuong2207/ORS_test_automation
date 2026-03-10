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

from .utility.get_text import get_text
from .utility.get_attribute import get_attribute

def set_variable(driver, wait, data, variables):
    name = data.get("name")
    value = data.get("value")
    if name:
        variables[name] = value
        print(f"[SET-VAR] {name} = {value}", flush=True)

from .utility.variable_manager import variable_manager

from .logic.loop_handler import loop_handler

from .interaction.keyboard_action import press_key, key_combination

# Registry: ánh xạ tên action (từ JSON node) sang hàm Python tương ứng
ACTION_REGISTRY = {
    "open-url": open_url,
    "mouse-click": click_element,
    "type-text": type_text,
    "hover-element": hover_element,
    "press-key": press_key,
    "key-combination": key_combination,
    "wait-time": wait_seconds,
    "take-screenshot": take_screenshot,
    "wait-element": wait_element,
    "verify-text": verify_text,
    "verify-visibility": verify_visibility,
    "if-condition": if_condition,
    "variable-manager": variable_manager,
    "loop": loop_handler,
    "connector": lambda driver, wait, data, variables: None
}
