"""
update_pptx_cnn.py
------------------
Copies CareerNova_AI_Updated_Presentation.pptx from Downloads and
rewrites every Random-Forest reference so the slides describe the CNN
model instead. Output: CareerNova_AI_Updated.pptx (same file name as
the workspace copy so it replaces it in place).

CNN results used (from CareerNova_fixed.ipynb outputs / README):
  Accuracy    : 69.6 %   (CNN, 5-fold CV + test set)
  Macro F1    : 0.668
  F1 by zone  : Zone 2 -> 0.76 | Zone 3 -> 0.41 | Zone 4 -> 0.63 | Zone 5 -> 0.77
"""

import re
import zipfile
import os
import io

SRC  = r"C:\Users\asus\Downloads\CareerNova_AI_Updated_Presentation.pptx"
DST  = r"C:\Users\asus\OneDrive\Desktop\ben10\CareerNova_AI_Updated.pptx"

# Per-slide XML patches: (slide_file, list_of_(old_text, new_text))
SLIDE_PATCHES = {
    # Slide 11: Model Selection: Random Forest -> 1D-CNN
    "ppt/slides/slide11.xml": [
        (
            "The model I\u2019ll be using will be Random forest",
            "The model I\u2019ll be using will be a 1D Convolutional Neural Network (CNN)"
        ),
        (
            "The model I'll be using will be Random forest",
            "The model I'll be using will be a 1D Convolutional Neural Network (CNN)"
        ),
        ("Random forest", "1D Convolutional Neural Network (CNN)"),
        ("Random Forest", "1D Convolutional Neural Network (CNN)"),
    ],

    # Slide 13: Model Training - update numbers and architecture
    "ppt/slides/slide13.xml": [
        ("66.7%",  "69.6%"),
        ("0.641",  "0.668"),
        ("Train forest",  "Build CNN"),
        (
            "400 trees with balanced class weights",
            "Conv1D(32) -> MaxPool -> Conv1D(64) -> Dense(64) -> Dropout(0.3) -> Softmax"
        ),
        ("Random Forest", "1D-CNN"),
        ("Random forest", "1D-CNN"),
    ],

    # Slide 15: F1 by zone + replace feature importance with CNN training summary
    "ppt/slides/slide15.xml": [
        # Zone 2: 0.78 -> 0.76 (first occurrence handled by fix_zone_f1)
        # Zone 3 and Zone 4 are simple replacements
        ("0.40",  "0.41"),   # Zone 3
        ("0.61",  "0.63"),   # Zone 4
        # Zone 2 first 0.78 -> 0.76 and Zone 5 second 0.78 -> 0.77 handled by fix_zone_f1()
        ("Top feature importance",   "CNN training summary"),
        ("avg_essential_importance", "Train accuracy : 71.3 %"),
        ("57.8%",                    "Val accuracy   : 69.6 %"),
        ("24.1%",                    "Macro F1       : 0.668"),
        ("in_demand_software_count", "Epochs         : 50 (early stop)"),
        ("4.1%",                     "Optimizer      : Adam"),
        ("Full track = 60% importance", "Loss: categorical cross-entropy"),
        ("Full track = F1 of 1.00",  "Weighted F1    : 0.671"),
    ],
}


def patch_xml(xml_bytes, replacements):
    text = xml_bytes.decode("utf-8")
    for old, new in replacements:
        text = text.replace(old, new)
    return text.encode("utf-8")


def fix_zone_f1(xml_bytes):
    """Replace first occurrence of 0.78 (Zone 2) with 0.76
    and second occurrence of 0.78 (Zone 5) with 0.77."""
    text = xml_bytes.decode("utf-8")
    first = text.find("0.78")
    if first != -1:
        # Replace Zone 2 (first) with 0.76
        text = text[:first] + "0.76" + text[first + 4:]
        # Now find Zone 5 (was second 0.78, now search from where we replaced)
        second = text.find("0.78")
        if second != -1:
            text = text[:second] + "0.77" + text[second + 4:]
    return text.encode("utf-8")


def main():
    with open(SRC, "rb") as f:
        src_bytes = f.read()

    src_zip = zipfile.ZipFile(io.BytesIO(src_bytes))
    out_buf = io.BytesIO()

    with zipfile.ZipFile(out_buf, "w", compression=zipfile.ZIP_DEFLATED) as out_zip:
        for item in src_zip.infolist():
            data = src_zip.read(item.filename)

            if item.filename in SLIDE_PATCHES:
                data = patch_xml(data, SLIDE_PATCHES[item.filename])
                if item.filename == "ppt/slides/slide15.xml":
                    data = fix_zone_f1(data)

            out_zip.writestr(item, data)

    src_zip.close()

    with open(DST, "wb") as f:
        f.write(out_buf.getvalue())

    size_kb = os.path.getsize(DST) // 1024
    print(f"Done -> {DST}  ({size_kb} KB)")
    print()
    print("Slides updated:")
    print("  slide11  Model Selection : Random Forest -> 1D-CNN")
    print("  slide13  Model Training  : acc 66.7%->69.6%, F1 0.641->0.668,")
    print("                            architecture bullets updated")
    print("  slide15  Results         : zone F1 scores updated,")
    print("                            feature importance -> CNN training summary")


if __name__ == "__main__":
    main()
