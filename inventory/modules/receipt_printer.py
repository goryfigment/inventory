import escpos.printer as escpos
import os
my_dir = os.path.dirname(__file__)


def align_left(left_text, right_text, font):
    text_max = 0
    right_length = len(right_text)
    left_length = len(left_text)
    offset = 4
    space = ''

    if font == 1:
        text_max = 48
    elif font == 2:
        text_max = 24
    elif font == 3:
        text_max = 16
    elif font == 4:
        text_max = 12
    elif font == 5:
        text_max = 9
    elif font == 6:
        text_max = 8
    elif font == 7:
        text_max = 6
    elif font == 8:
        text_max = 6

    text_max -= right_length + offset

    if left_length > text_max:
        left_text = left_text[:(text_max - 2)] + '..'
    else:
        space = ' '*(text_max - left_length)

    return left_text + space + '    ' + right_text


def receipt_printer(settings, transaction):
    headers = settings.header['lines']
    footers = settings.footer['lines']
    epson = escpos.Network(settings.ip_address)

    # Image
    epson.set(align='center')
    epson.image(os.path.join(os.path.dirname(__file__), 'test.png'))
    epson.text('\n\n')

    # Do header
    if len(headers):
        for header in headers:
            size = int(header['size'])
            epson.set(align=header['align'], font="a", height=size, width=size)
            epson.text(header['text']+'\n')

    # Then do items
    for key, item in transaction['items'].iteritems():
        epson.set(align='left', font="a", height=1, width=1)
        epson.text('\n\n')
        epson.text(align_left('  '+item['name'], str(item['paid']), 1))

        if float(item['discount']) > 0:
            epson.set(align='left', font="a", height=1, width=1)
            epson.text(align_left('  ('+str(item['quantity'])+' @ '+str(item['paid'])+' ea)', 'Discount '+str(item['discount'])+'-       ', 1))
        else:
            epson.set(align='left', font="a", height=1, width=1)
            epson.text('  ('+str(item['quantity'])+' @ '+str(item['paid'])+' ea)')

    epson.set(align='left', font="a", height=1, width=1)
    epson.text('\n\n' + align_left('  Subtotal', str(transaction['subtotal']), 1))

    epson.set(align='left', font="a", height=1, width=1)
    epson.text(align_left('  Tax('+str(transaction['tax_percent'])+'%)', str(transaction['tax_total']), 1))

    epson.set(align='left', font="a", height=2, width=2)
    epson.text(align_left(' TOTAL', str(transaction['total']), 2))
    epson.text('\n\n\n')

    # Do footer
    if len(footers):
        for footer in footers:
            size = int(footer['size'])

            epson.set(align=footer['align'], font="a", height=size, width=size)
            epson.text(footer['text']+'\n')

    epson.cut()
