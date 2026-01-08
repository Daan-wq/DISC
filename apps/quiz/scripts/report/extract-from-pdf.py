#!/usr/bin/env python3
"""
Extract exact coordinates from PDF by finding placeholder text.
Outputs precise bounding boxes for overlays in JSON format.

Usage: python extract-from-pdf.py CD
"""

import sys
import json
from pathlib import Path
import pdfplumber

def extract_positions(profile_code):
    """Extract positions from base PDF for a profile."""
    
    base_pdf_path = Path(__file__).parent.parent.parent / 'assets' / 'report' / 'base-pdf' / f'{profile_code}.pdf'
    
    if not base_pdf_path.exists():
        print(f"Error: PDF not found at {base_pdf_path}")
        return None
    
    print(f"\nExtracting positions from {profile_code}.pdf...")
    
    positions = {
        'templateVersion': '2025-12-26',
        'profileCode': profile_code,
        'pages': 9,
        'fields': {}
    }
    
    with pdfplumber.open(base_pdf_path) as pdf:
        # Page 1 (index 0): <<Naam>>
        print('  Extracting from page 1...')
        page1 = pdf.pages[0]
        page1_text = page1.extract_words()
        
        for word in page1_text:
            if '<<Naam>>' in word['text'] or 'Naam' in word['text']:
                # pdfplumber gives top-left origin, convert to bottom-left for pdf-lib
                page_height = page1.height
                positions['fields']['name'] = {
                    'pageIndex': 0,
                    'rect': {
                        'x': word['x0'],
                        'y': page_height - word['bottom'],  # Convert to bottom-left
                        'w': word['x1'] - word['x0'],
                        'h': word['bottom'] - word['top']
                    },
                    'source': 'PDF_EXTRACTION',
                    'styles': {
                        'fontFamily': '"PT Sans", sans-serif',
                        'fontSize': word['bottom'] - word['top'],
                        'fontWeight': '400',
                        'color': 'rgb(70, 149, 96)',
                        'textAlign': 'center',
                        'letterSpacing': 0
                    }
                }
                print(f"    ✓ Found <<Naam>>: x={word['x0']:.2f}, y={page_height - word['bottom']:.2f}, w={word['x1'] - word['x0']:.2f}, h={word['bottom'] - word['top']:.2f}")
                break
        
        # Page 2 (index 1): <<Voornaam>>, <<Datum>>, <<Stijl>>
        print('  Extracting from page 2...')
        page2 = pdf.pages[1]
        page2_text = page2.extract_words()
        page2_height = page2.height
        
        for word in page2_text:
            if '<<Voornaam>>' in word['text'] or 'Voornaam' in word['text']:
                positions['fields']['firstName'] = {
                    'pageIndex': 1,
                    'rect': {
                        'x': word['x0'],
                        'y': page2_height - word['bottom'],
                        'w': word['x1'] - word['x0'],
                        'h': word['bottom'] - word['top']
                    },
                    'source': 'PDF_EXTRACTION',
                    'styles': {
                        'fontFamily': '"PT Sans", sans-serif',
                        'fontSize': word['bottom'] - word['top'],
                        'fontWeight': '400',
                        'color': 'rgb(70, 149, 96)',
                        'textAlign': 'center',
                        'letterSpacing': -1.74
                    }
                }
                print(f"    ✓ Found <<Voornaam>>: x={word['x0']:.2f}, y={page2_height - word['bottom']:.2f}")
            
            if '<<Datum>>' in word['text'] or 'Datum' in word['text']:
                positions['fields']['date'] = {
                    'pageIndex': 1,
                    'rect': {
                        'x': word['x0'],
                        'y': page2_height - word['bottom'],
                        'w': word['x1'] - word['x0'],
                        'h': word['bottom'] - word['top']
                    },
                    'source': 'PDF_EXTRACTION',
                    'styles': {
                        'fontFamily': '"PT Sans", sans-serif',
                        'fontSize': word['bottom'] - word['top'],
                        'fontWeight': '700',
                        'color': 'rgb(2, 2, 3)',
                        'textAlign': 'center',
                        'letterSpacing': 0
                    }
                }
                print(f"    ✓ Found <<Datum>>: x={word['x0']:.2f}, y={page2_height - word['bottom']:.2f}")
            
            if '<<Stijl>>' in word['text'] or 'Stijl' in word['text']:
                positions['fields']['style'] = {
                    'pageIndex': 1,
                    'rect': {
                        'x': word['x0'],
                        'y': page2_height - word['bottom'],
                        'w': word['x1'] - word['x0'],
                        'h': word['bottom'] - word['top']
                    },
                    'source': 'PDF_EXTRACTION',
                    'styles': {
                        'fontFamily': '"PT Sans", sans-serif',
                        'fontSize': word['bottom'] - word['top'],
                        'fontWeight': '700',
                        'color': 'rgb(2, 2, 3)',
                        'textAlign': 'center',
                        'letterSpacing': 0
                    }
                }
                print(f"    ✓ Found <<Stijl>>: x={word['x0']:.2f}, y={page2_height - word['bottom']:.2f}")
        
        # Page 3 (index 2): Chart area and 8× "0%" percentages
        print('  Extracting from page 3...')
        page3 = pdf.pages[2]
        page3_text = page3.extract_words()
        page3_height = page3.height
        
        # Find all "0%" on page 3
        zero_percent_items = [w for w in page3_text if w['text'] == '0%']
        print(f"    Found {len(zero_percent_items)} instances of '0%'")
        
        # Filter to right side table (x > 380)
        table_items = [w for w in zero_percent_items if w['x0'] > 380]
        print(f"    Filtered to {len(table_items)} table percentages")
        
        # Sort by Y position (top to bottom)
        table_items.sort(key=lambda w: w['top'])
        
        # Split into Natural (left) and Response (right) columns
        natural_col = [w for w in table_items if w['x0'] < 450]
        response_col = [w for w in table_items if w['x0'] >= 450]
        
        field_names = ['naturalD', 'naturalI', 'naturalS', 'naturalC']
        for i, word in enumerate(natural_col[:4]):
            field_name = field_names[i]
            positions['fields'][field_name] = {
                'pageIndex': 2,
                'rect': {
                    'x': word['x0'],
                    'y': page3_height - word['bottom'],
                    'w': word['x1'] - word['x0'],
                    'h': word['bottom'] - word['top']
                },
                'source': 'PERCENTAGE',
                'styles': {
                    'fontFamily': '"PT Sans", sans-serif',
                    'fontSize': word['bottom'] - word['top'],
                    'fontWeight': '400',
                    'color': 'rgb(255, 255, 255)',
                    'textAlign': 'center'
                }
            }
            print(f"    ✓ {field_name}: x={word['x0']:.2f}, y={page3_height - word['bottom']:.2f}")
        
        response_field_names = ['responseD', 'responseI', 'responseS', 'responseC']
        for i, word in enumerate(response_col[:4]):
            field_name = response_field_names[i]
            positions['fields'][field_name] = {
                'pageIndex': 2,
                'rect': {
                    'x': word['x0'],
                    'y': page3_height - word['bottom'],
                    'w': word['x1'] - word['x0'],
                    'h': word['bottom'] - word['top']
                },
                'source': 'PERCENTAGE',
                'styles': {
                    'fontFamily': '"PT Sans", sans-serif',
                    'fontSize': word['bottom'] - word['top'],
                    'fontWeight': '400',
                    'color': 'rgb(255, 255, 255)',
                    'textAlign': 'center'
                }
            }
            print(f"    ✓ {field_name}: x={word['x0']:.2f}, y={page3_height - word['bottom']:.2f}")
        
        # Chart area - from your measurements
        positions['fields']['chart'] = {
            'pageIndex': 2,
            'rect': {
                'x': 64.02,
                'y': 99.83,
                'w': 277.20,
                'h': 215.99
            },
            'source': 'SELECTOR'
        }
        print('    ✓ Chart area set from measurements')
    
    # Save to positions file
    output_path = Path(__file__).parent.parent.parent / 'assets' / 'report' / 'positions' / f'{profile_code}.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(positions, f, indent=2)
    
    print(f"\n✓ Saved to: {output_path}")
    return positions

if __name__ == '__main__':
    profile_code = sys.argv[1] if len(sys.argv) > 1 else 'CD'
    result = extract_positions(profile_code)
    
    if result:
        print('\n✓ Extraction complete')
    else:
        print('\n✗ Extraction failed')
        sys.exit(1)
