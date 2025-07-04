import os
from steganography import encode_image, decode_image

def test_encode_and_decode(tmp_path):
    input_img = "test.image.jpg"
    output_img = tmp_path / "output.png"
    message = "Secret123"

    assert encode_image(input_img, message, str(output_img)) is True
    assert decode_image(str(output_img)) == message

def test_invalid_image_type():
    try:
        encode_image("test.image.jpg", "msg", "output.png")
    except ValueError as e:
        assert str(e) == "Image must be in RGB mode"
