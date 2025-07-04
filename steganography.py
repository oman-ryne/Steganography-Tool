from PIL import Image

def encode_image(image_path, message, output_path):
    img = Image.open(image_path)
    if img.mode != 'RGB':
        raise ValueError("Image must be in RGB mode")

    binary_message = ''.join([format(ord(c), '08b') for c in message]) + '11111110'
    pixels = list(img.getdata())
    new_pixels = []

    msg_index = 0
    for pixel in pixels:
        if msg_index < len(binary_message):
            r = pixel[0] & ~1 | int(binary_message[msg_index])
            msg_index += 1
        else:
            r = pixel[0]
        new_pixels.append((r, pixel[1], pixel[2]))

    img.putdata(new_pixels)
    img.save(output_path)
    return True

def decode_image(image_path):
    img = Image.open(image_path)
    pixels = list(img.getdata())

    binary = ''
    for pixel in pixels:
        binary += str(pixel[0] & 1)

    bytes_list = [binary[i:i+8] for i in range(0, len(binary), 8)]
    message = ''
    for byte in bytes_list:
        if byte == '11111110':
            break
        message += chr(int(byte, 2))

    return message
