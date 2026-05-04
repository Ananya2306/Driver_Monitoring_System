const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, LevelFormat, PageBreak, PageNumber
} = require('docx');
const fs = require('fs');

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  blue:   "1F3864", dblue:  "2E75B6", lblue:  "D6E4F7",
  grey:   "F2F2F2", dgrey:  "D9D9D9", white:  "FFFFFF",
  black:  "000000", red:    "C00000", green:  "375623",
  amber:  "7F6000", teal:   "005C5C",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const bdr = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top:bdr, bottom:bdr, left:bdr, right:bdr };
const noBdr = { style: BorderStyle.NONE, size:0, color:"FFFFFF" };
const noBorders = { top:noBdr, bottom:noBdr, left:noBdr, right:noBdr };

const hline = (color=C.dblue) => new Paragraph({
  border:{ bottom:{ style:BorderStyle.SINGLE, size:8, color, space:1 } },
  spacing:{ after:120 }, children:[]
});
const sp = (n=80) => new Paragraph({ children:[new TextRun("")], spacing:{ after:n } });

const h1 = t => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing:{ before:320, after:160 },
  children:[new TextRun({ text:t, bold:true, size:28, color:C.blue, font:"Arial" })]
});
const h2 = t => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing:{ before:240, after:120 },
  children:[new TextRun({ text:t, bold:true, size:24, color:C.dblue, font:"Arial" })]
});
const h3 = t => new Paragraph({
  heading: HeadingLevel.HEADING_3, spacing:{ before:160, after:80 },
  children:[new TextRun({ text:t, bold:true, size:22, color:"444444", font:"Arial" })]
});

const para = (runs, opts={}) => {
  const children = typeof runs==='string'
    ? [new TextRun({ text:runs, size:22, font:"Arial" })] : runs;
  return new Paragraph({ alignment:AlignmentType.JUSTIFIED, spacing:{ after:120, line:300 }, ...opts, children });
};
const R   = t => new TextRun({ text:t, size:22, font:"Arial" });
const B   = t => new TextRun({ text:t, bold:true, size:22, font:"Arial" });
const I   = t => new TextRun({ text:t, italics:true, size:22, font:"Arial" });

const bullet = (text, level=0) => new Paragraph({
  numbering:{ reference:"bullets", level },
  spacing:{ after:80 }, indent:{ left:720, hanging:360 },
  children: typeof text==='string'
    ? [new TextRun({ text, size:22, font:"Arial" })] : text
});

const tc = (text, {isBold=false,center=false,bg=C.white,color=C.black,w=1000,sz=20,colspan=1}={}) =>
  new TableCell({
    borders, columnSpan:colspan,
    width:{ size:w, type:WidthType.DXA },
    shading:{ fill:bg, type:ShadingType.CLEAR },
    verticalAlign:VerticalAlign.CENTER,
    margins:{ top:80, bottom:80, left:120, right:120 },
    children:[new Paragraph({
      alignment: center?AlignmentType.CENTER:AlignmentType.LEFT,
      children:[new TextRun({ text:String(text), bold:isBold, size:sz, font:"Arial", color })]
    })]
  });

const hrow = (cells, bg=C.blue) => new TableRow({
  tableHeader:true,
  children: cells.map(([t,w]) => tc(t,{ isBold:true, center:true, bg, color:C.white, w, sz:20 }))
});

const figCaption = t => new Paragraph({
  alignment:AlignmentType.CENTER, spacing:{ after:160 },
  children:[new TextRun({ text:t, italics:true, size:19, font:"Arial", color:"555555" })]
});

// ── DOCUMENT ──────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering:{ config:[
    { reference:"bullets", levels:[
      { level:0, format:LevelFormat.BULLET, text:"\u2022", alignment:AlignmentType.LEFT,
        style:{ paragraph:{ indent:{ left:720, hanging:360 } } } },
      { level:1, format:LevelFormat.BULLET, text:"\u25E6", alignment:AlignmentType.LEFT,
        style:{ paragraph:{ indent:{ left:1080, hanging:360 } } } },
    ]},
    { reference:"nums", levels:[
      { level:0, format:LevelFormat.DECIMAL, text:"%1.", alignment:AlignmentType.LEFT,
        style:{ paragraph:{ indent:{ left:720, hanging:360 } } } },
    ]},
  ]},
  styles:{
    default:{ document:{ run:{ font:"Arial", size:22 } } },
    paragraphStyles:[
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:28, bold:true, font:"Arial", color:C.blue },
        paragraph:{ spacing:{ before:320, after:160 }, outlineLevel:0 } },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:24, bold:true, font:"Arial", color:C.dblue },
        paragraph:{ spacing:{ before:240, after:120 }, outlineLevel:1 } },
      { id:"Heading3", name:"Heading 3", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:22, bold:true, font:"Arial", color:"444444" },
        paragraph:{ spacing:{ before:160, after:80 }, outlineLevel:2 } },
    ]
  },
  sections:[{
    properties:{
      page:{
        size:{ width:12240, height:15840 },
        margin:{ top:1440, right:1260, bottom:1440, left:1260 }
      }
    },
    headers:{ default: new Header({ children:[new Paragraph({
      border:{ bottom:{ style:BorderStyle.SINGLE, size:6, color:C.dblue, space:1 } },
      alignment:AlignmentType.RIGHT,
      children:[new TextRun({ text:"Driver Monitoring System — Enhanced Research Paper  |  IILM University, 2026", size:18, color:"888888", font:"Arial" })]
    })]})},
    footers:{ default: new Footer({ children:[new Paragraph({
      border:{ top:{ style:BorderStyle.SINGLE, size:6, color:C.dblue, space:1 } },
      alignment:AlignmentType.CENTER,
      children:[new TextRun({ text:"Dept. of CSE (AI & ML), IILM University, Greater Noida  |  Page ", size:18, color:"888888", font:"Arial" }),
        new TextRun({ children:[PageNumber.CURRENT], font:"Arial", size:18, color:"888888" })]
    })]})},
    children:[

// ═══════════════════════════════════════════════════════════════════════
// TITLE PAGE
// ═══════════════════════════════════════════════════════════════════════
new Paragraph({ alignment:AlignmentType.CENTER, spacing:{ before:240, after:80 },
  children:[new TextRun({ text:"Driver Monitoring System using Dual Deep Learning Models", bold:true, size:44, color:C.blue, font:"Arial" })] }),
new Paragraph({ alignment:AlignmentType.CENTER, spacing:{ after:60 },
  children:[new TextRun({ text:"for Fatigue and Smoking Detection", bold:true, size:36, color:C.dblue, font:"Arial" })] }),
new Paragraph({ alignment:AlignmentType.CENTER, spacing:{ after:40 },
  children:[new TextRun({ text:"— Enhanced Edition with Temporal Behavior Analysis —", bold:false, size:26, color:"555555", font:"Arial", italics:true })] }),
hline(),

// Authors
new Table({ width:{ size:9360, type:WidthType.DXA }, columnWidths:[3120,3120,3120], rows:[
  new TableRow({ children:[
    new TableCell({ borders:noBorders, shading:{ fill:C.lblue, type:ShadingType.CLEAR }, margins:{top:100,bottom:80,left:100,right:100}, width:{size:3120,type:WidthType.DXA}, children:[
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"Ananya", bold:true, size:22, font:"Arial", color:C.blue })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"ananya.arora.cs28@iilm.edu", size:18, font:"Arial", color:"666666" })] }),
    ]}),
    new TableCell({ borders:noBorders, shading:{ fill:C.lblue, type:ShadingType.CLEAR }, margins:{top:100,bottom:80,left:100,right:100}, width:{size:3120,type:WidthType.DXA}, children:[
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"Yashashwai Chaudhary", bold:true, size:22, font:"Arial", color:C.blue })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"yashashwai.chaudhary.cs28@iilm.edu", size:18, font:"Arial", color:"666666" })] }),
    ]}),
    new TableCell({ borders:noBorders, shading:{ fill:C.lblue, type:ShadingType.CLEAR }, margins:{top:100,bottom:80,left:100,right:100}, width:{size:3120,type:WidthType.DXA}, children:[
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"Chaithrika Yadav", bold:true, size:22, font:"Arial", color:C.blue })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"chaithrika.yadav.cs28@iilm.edu", size:18, font:"Arial", color:"666666" })] }),
    ]}),
  ]}),
  new TableRow({ children:[
    new TableCell({ borders:noBorders, shading:{ fill:C.lblue, type:ShadingType.CLEAR }, margins:{top:40,bottom:80,left:100,right:100}, width:{size:3120,type:WidthType.DXA}, children:[
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"Kanishk Narang", bold:true, size:22, font:"Arial", color:C.blue })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"kanishk.narang.cs28@iilm.edu", size:18, font:"Arial", color:"666666" })] }),
    ]}),
    new TableCell({ borders:noBorders, shading:{ fill:C.lblue, type:ShadingType.CLEAR }, margins:{top:40,bottom:80,left:100,right:100}, width:{size:3120,type:WidthType.DXA}, children:[
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"Aryan Singh", bold:true, size:22, font:"Arial", color:C.blue })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"aryan.singh3.cs28@iilm.edu", size:18, font:"Arial", color:"666666" })] }),
    ]}),
    new TableCell({ borders:noBorders, shading:{ fill:C.lblue, type:ShadingType.CLEAR }, margins:{top:40,bottom:80,left:100,right:100}, width:{size:3120,type:WidthType.DXA}, children:[
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"Ms. Surabhi Purwar (Supervisor)", bold:true, size:22, font:"Arial", color:C.red })] }),
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"surabhi.purwar@iilm.edu", size:18, font:"Arial", color:"666666" })] }),
    ]}),
  ]}),
  new TableRow({ children:[
    new TableCell({ borders:noBorders, columnSpan:3, shading:{ fill:C.lblue, type:ShadingType.CLEAR }, margins:{top:40,bottom:80,left:100,right:100}, width:{size:9360,type:WidthType.DXA}, children:[
      new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"Department of Computer Science Engineering (AI & ML), IILM University, Greater Noida, India", size:19, font:"Arial", italics:true, color:"333333" })] }),
    ]}),
  ]}),
]}),
sp(160),

// Abstract box
new Table({ width:{ size:9360, type:WidthType.DXA }, columnWidths:[9360], rows:[new TableRow({ children:[
  new TableCell({ borders, shading:{ fill:"EEF4FB", type:ShadingType.CLEAR }, margins:{top:120,bottom:120,left:200,right:200}, width:{size:9360,type:WidthType.DXA}, children:[
    new Paragraph({ alignment:AlignmentType.CENTER, spacing:{ after:100 }, children:[new TextRun({ text:"Abstract", bold:true, size:26, color:C.blue, font:"Arial" })] }),
    para("Driver fatigue and smoking-induced distraction are leading contributors to road accidents worldwide. This paper presents an enhanced Driver Monitoring System (DMS) that extends conventional frame-level CNN classification with a twelve-feature temporal behavior analysis engine. Two independently trained deep learning models — a custom CNN achieving 93.5% accuracy (AUC = 1.00) for fatigue detection and a MobileNetV2 transfer-learning model achieving 91.2% accuracy (AUC = 0.98) for smoking detection — are deployed as a RESTful FastAPI service. The frontend (Next.js) integrates temporal fatigue scoring over a 40-frame sliding window, micro-fatigue event detection, adaptive bilingual multi-modal alerts (English + Hindi: BEEP for WARNING, VOICE for CRITICAL, escalation after five consecutive warnings), smoking frequency analysis, CLAHE low-light preprocessing, real-time performance monitoring at 15+ FPS with sub-70ms API latency, and session-level analytics with CSV event logging. Comprehensive evaluation demonstrates that the eye-strip cropping preprocessing strategy resolves the dark-frame false-positive issue inherent in full-frame inference on low-contrast subjects. Temporal scorer simulation confirms appropriate WARNING-to-CRITICAL escalation after sustained drowsiness with rapid SAFE recovery. The proposed system is non-intrusive, camera-only, and suitable for deployment in intelligent driver assistance environments."),
    sp(80),
    new Paragraph({ spacing:{ after:0 }, children:[
      new TextRun({ text:"Keywords: ", bold:true, size:20, font:"Arial", color:C.dblue }),
      new TextRun({ text:"Driver Monitoring System, Fatigue Detection, Smoking Detection, CNN, MobileNetV2, Transfer Learning, Temporal Analysis, CLAHE, Adaptive Alerts, Bilingual Voice, FastAPI, Next.js", size:20, font:"Arial", italics:true }),
    ]}),
  ]}),
]})]}) ,
sp(),

// ═══════════════════════════════════════════════════════════════════════
// I. INTRODUCTION
// ═══════════════════════════════════════════════════════════════════════
h1("I.  Introduction"),
hline(),
para([R("Road accidents claim approximately 1.35 million lives annually (WHO, 2023), with driver fatigue and behavioral distractions such as smoking consistently identified as primary causal factors. Fatigue degrades alertness, slows reaction time, and impairs decision-making, while smoking introduces concurrent physical and cognitive distractions. Traditional monitoring solutions depend on intrusive wearable sensors or vehicle-integrated hardware, imposing cost barriers and limiting scalability.")]),
para([R("Vision-based, non-intrusive monitoring leverages CNNs to analyze camera input in real time. However, most deployed systems perform only "), I("per-frame binary classification"), R(" (Drowsy / Not Drowsy) — a fundamental limitation. A single drowsy frame carries no temporal context and cannot distinguish a blink from a genuine micro-sleep episode. Systems lacking temporal integration also cannot provide graduated alerts proportional to fatigue severity, nor can they log session-level behavioral analytics for post-hoc risk assessment.")]),
para([R("This paper addresses all three limitations with a "), B("dual-model, temporally-aware DMS"), R(" featuring twelve integrated modules. The system transitions from reactive classification to proactive behavior monitoring: it assigns a continuous fatigue score over a rolling 40-frame window, requires four consecutive drowsy detections before any alert fires (eliminating single-frame false positives), escalates through SAFE → WARNING → CRITICAL → ESCALATION based on sustained detection, and delivers bilingual (English + Hindi) multi-modal alerts via calibrated WAV sound files and speech synthesis.")]),
para([B("Contributions of this work:"), R(" (1) Eye-strip cropping preprocessing that resolves the dark-frame false-positive problem for dark-skinned subjects. (2) Transfer learning (MobileNetV2) that raises smoking accuracy from 80% to 91%+ despite dataset size constraints. (3) A temporally-aware alert engine with detected-flag-based consecutive counter that resets immediately when the subject is awake. (4) Full bilingual voice alert integration with mode-aware messages.")]),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// II. PROBLEM STATEMENT
// ═══════════════════════════════════════════════════════════════════════
h1("II.  Problem Statement"),
hline(),
para("Existing driver monitoring systems suffer from three persistent limitations:"),
bullet([B("No temporal context: "), R("Frame-level classifiers produce independent predictions. A detector reporting DROWSY for one frame in thirty cannot distinguish a blink from genuine fatigue.")]),
bullet([B("Non-adaptive alerts: "), R("Binary alarm systems cause rapid habituation. A constant beep regardless of severity is ignored within minutes of deployment.")]),
bullet([B("No session analytics: "), R("Drivers and fleet operators need aggregated behavioral data — not just per-frame labels — to assess risk and evaluate interventions.")]),
sp(),
para([B("Additional technical problem identified during development: "), R("Standard preprocessing (resize full webcam frame to 64×64) causes systematic false DROWSY predictions for dark-skinned subjects in dim lighting. The fatigue CNN (trained on close-up MRL Eye Dataset images) interprets dark background pixels as closed eyes. Fix: detect face → extract eye strip (25%–62% of face height) before resizing.")]),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// III. LITERATURE REVIEW
// ═══════════════════════════════════════════════════════════════════════
h1("III.  Literature Review"),
hline(),
para("Early fatigue detection relied on handcrafted geometric descriptors — Eye Aspect Ratio (EAR), blink frequency, PERCLOS — which are sensitive to lighting variation and occlusion. CNN-based approaches substantially improved robustness: Hu et al. [6] demonstrated real-time fatigue detection under diverse lighting using residual networks; Park et al. [7] achieved state-of-the-art drowsiness classification on the NTHU-DDD dataset. Abtahi et al. [5] reduced false positives by incorporating yawning and head-pose analysis."),
para("For smoking detection, Girshick [11] proposed object-detection pipelines for cigarette localization; Zhang et al. [12] extended this to driver-specific streams; Wang et al. [14] applied deep learning to smoking behavior recognition achieving ~83% accuracy on unconstrained images. The key gap across all prior work is the absence of temporal integration — frame-level classifiers produce independent predictions without modeling continuity."),
para("No prior DMS system in the reviewed literature combines (a) an adaptive cooldown-based alert hierarchy, (b) session-level analytics, (c) bilingual voice alerts, (d) face-to-eye-strip cropping for dark-subject robustness, and (e) transfer-learning-based smoking detection with two-stage fine-tuning. These constitute the novel contributions of the proposed system."),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// IV. DATASETS
// ═══════════════════════════════════════════════════════════════════════
h1("IV.  Dataset and Preprocessing"),
hline(),
h2("A.  Datasets"),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[2400,1560,1560,1320,1320,2400], rows:[
  hrow([["Dataset",2400],["Task",1560],["Samples",1560],["Train",1320],["Test",1320],["Source",2400]]),
  new TableRow({ children:[tc("MRL Eye Dataset",{w:2400,sz:20}),tc("Fatigue",{w:1560,center:true,sz:20}),tc("84,898",{w:1560,center:true,sz:20}),tc("70%",{w:1320,center:true,sz:20}),tc("30%",{w:1320,center:true,sz:20}),tc("Kaggle [1]",{w:2400,sz:20})] }),
  new TableRow({ children:[tc("NTHU-DDD",{w:2400,bg:C.grey,sz:20}),tc("Fatigue",{w:1560,center:true,bg:C.grey,sz:20}),tc("~3,600 clips",{w:1560,center:true,bg:C.grey,sz:20}),tc("80%",{w:1320,center:true,bg:C.grey,sz:20}),tc("20%",{w:1320,center:true,bg:C.grey,sz:20}),tc("NTHU [2]",{w:2400,bg:C.grey,sz:20})] }),
  new TableRow({ children:[tc("Smoking vs Not Smoking",{w:2400,sz:20}),tc("Smoking",{w:1560,center:true,sz:20}),tc("1,566",{w:1560,center:true,sz:20}),tc("80%",{w:1320,center:true,sz:20}),tc("20%",{w:1320,center:true,sz:20}),tc("Roboflow [3]",{w:2400,sz:20})] }),
  new TableRow({ children:[tc("Cigarette Reality",{w:2400,bg:C.grey,sz:20}),tc("Smoking",{w:1560,center:true,bg:C.grey,sz:20}),tc("Augmentative",{w:1560,center:true,bg:C.grey,sz:20}),tc("80%",{w:1320,center:true,bg:C.grey,sz:20}),tc("20%",{w:1320,center:true,bg:C.grey,sz:20}),tc("Roboflow [4]",{w:2400,bg:C.grey,sz:20})] }),
]}),
figCaption("Table I: Dataset Summary"),

h2("B.  Why Smoking Accuracy Was 80% (and How We Fixed It)"),
para("The original smoking model achieved only 79.9% accuracy due to three compounding factors:"),
bullet([B("Dataset size disparity: "), R("The smoking dataset (~1,566 images) is 54× smaller than the fatigue dataset (84,898 images). A custom CNN trained from scratch on 1,566 images overfits regardless of augmentation.")]),
bullet([B("Visual complexity: "), R("Smoking detection requires recognizing cigarette presence, hand position, and smoke — far more complex than the binary eye-open/closed pattern. At 64×64 resolution a cigarette occupies ~8 pixels.")]),
bullet([B("Class imbalance: "), R("Real-world driving has far fewer smoking frames than non-smoking frames, creating a prediction bias toward the majority class.")]),
sp(),
para([B("Fix 1 — Transfer Learning (MobileNetV2): "), R("Replaces the custom CNN with ImageNet-pretrained MobileNetV2. The pretrained features (edges, textures, shapes) provide rich visual representations even with small datasets. Two-stage training: freeze base → train head (15 epochs) → unfreeze top 30 layers → fine-tune with LR/10 (25 epochs).")]),
para([B("Fix 2 — Higher Resolution (128×128): "), R("Cigarettes are too small at 64×64. Training at 128×128 allows the model to see cigarette-specific visual patterns.")]),
para([B("Fix 3 — Class Weight Balancing: "), R("sklearn.compute_class_weight('balanced') assigns higher loss weight to the minority class (smoking), forcing the model to learn its patterns rather than defaulting to 'not smoking'.")]),
para([B("Result: "), R("Smoking accuracy improves from 79.9% → 91.2% (AUC: 0.98 → 0.98, Recall: 59.3% → 88.7%).")]),

h2("C.  Preprocessing Pipeline"),
para("All inference frames pass through a seven-stage pipeline:"),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[480,2400,3960,2520], rows:[
  hrow([["Step",480],["Operation",2400],["Detail",3960],["Purpose",2520]]),
  ...[
    ["1","Face Detection","Haar cascade (frontal + profile, 3 param sets). Falls back to brightness-guided crop.","Isolate subject from background"],
    ["2","Eye Strip Extraction","Rows 25%\u201362% of face height (where eyes live).","Correct input domain for MRL-trained CNN"],
    ["3","CLAHE Enhancement","L-channel of LAB space, clipLimit=2.0, tileGrid=8\u00d78.","Low-light robustness in dark cabin"],
    ["4","Resize","64\u00d764 (fatigue) / 128\u00d7128 (smoking) px.","Match model input shape"],
    ["5","BGR \u2192 RGB","cv2.COLOR_BGR2RGB","Match training colour statistics"],
    ["6","Gaussian Blur","3\u00d73 kernel, \u03c3=0.","Reduce high-frequency noise"],
    ["7","Normalise + Batch","Divide by 255.0, expand_dims(axis=0)","Stable gradient flow, batch inference"],
  ].map(([n,op,det,pur],i) => new TableRow({ children:[
    tc(n,{w:480,center:true,isBold:true,color:C.dblue,bg:i%2===0?C.white:C.grey,sz:20}),
    tc(op,{w:2400,isBold:true,bg:i%2===0?C.white:C.grey,sz:20}),
    tc(det,{w:3960,bg:i%2===0?C.white:C.grey,sz:19}),
    tc(pur,{w:2520,bg:i%2===0?C.white:C.grey,sz:19}),
  ]}))
]}),
figCaption("Table II: Seven-Stage Preprocessing Pipeline"),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// V. MODEL ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════
h1("V.  Model Architecture"),
hline(),

h2("A.  Fatigue Detection — Custom CNN"),
para([R("A purpose-built CNN with BatchNormalization and dual-conv blocks. BatchNorm after each convolution stabilizes training and permits higher learning rates. Dropout rates are calibrated to prevent overfitting on eye-state patterns. The eye-strip input (post-preprocessing) ensures the model receives the correct domain: close-up eye region matching the MRL Eye Dataset training distribution.")]),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[2200,2400,2360,2400], rows:[
  hrow([["Layer / Block",2200],["Configuration",2400],["Output Shape",2360],["Notes",2400]]),
  ...[
    ["Input","64\u00d764\u00d73","(64,64,3)","Eye-strip region"],
    ["Conv2D \u00d72 + BN + ReLU","32 filters, 3\u00d73, same padding","(64,64,32)","Dual-conv for richer features"],
    ["MaxPool2D + Dropout","Pool 2\u00d72, p=0.25","(32,32,32)","Spatial reduction + regularisation"],
    ["Conv2D \u00d72 + BN + ReLU","64 filters, 3\u00d73, same padding","(32,32,64)","Feature abstraction"],
    ["MaxPool2D + Dropout","Pool 2\u00d72, p=0.25","(16,16,64)",""],
    ["Conv2D \u00d72 + BN + ReLU","128 filters, 3\u00d73, same padding","(16,16,128)","High-level features"],
    ["MaxPool2D + Dropout","Pool 2\u00d72, p=0.25","(8,8,128)",""],
    ["Flatten","—","(8192)",""],
    ["Dense + BN + ReLU","256 units","(256)","Classification head"],
    ["Dropout","p=0.50","(256)","Prevents overfitting"],
    ["Dense (Output)","1 unit, sigmoid","(1)","Drowsy probability"],
  ].map(([l,c,s,n],i)=>new TableRow({ children:[
    tc(l,{w:2200,bg:i%2===0?C.white:C.grey,sz:19,isBold:i===0||i===10}),
    tc(c,{w:2400,center:true,bg:i%2===0?C.white:C.grey,sz:19}),
    tc(s,{w:2360,center:true,bg:i%2===0?C.white:C.grey,sz:19}),
    tc(n,{w:2400,bg:i%2===0?C.white:C.grey,sz:18}),
  ]}))
]}),
figCaption("Table III: Fatigue Detection CNN Architecture"),
para([B("Training: "), R("Adam + CosineDecayRestarts (LR=0.001), Binary Cross-Entropy, batch 32, early stopping on val_AUC (patience=7).")]),

h2("B.  Smoking Detection — MobileNetV2 Transfer Learning"),
para([R("MobileNetV2 (pretrained ImageNet) provides deep feature representations essential for recognizing the complex visual patterns of smoking behavior — hand position, cigarette geometry, smoke texture — even with a small dataset. The two-stage training protocol prevents catastrophic forgetting of pretrained weights while adapting them to the smoking domain.")]),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[2600,3160,3600], rows:[
  hrow([["Training Stage",2600],["Configuration",3160],["Purpose",3600]]),
  ...[
    ["Stage 1 — Head Training","Freeze MobileNetV2. Train GlobalAvgPool \u2192 Dense(256) \u2192 Dense(64) \u2192 Sigmoid. LR=5\u00d710\u207b\u2074. 15 epochs.","Fast convergence; protects pretrained weights from large gradient updates."],
    ["Stage 2 — Fine-Tuning","Unfreeze top 30 MobileNetV2 layers. LR=5\u00d710\u207b\u2075 (10\u00d7 lower). Up to 25 additional epochs.","Adapts ImageNet features specifically to smoking visual patterns."],
    ["Class Balancing","sklearn compute_class_weight('balanced')","Corrects bias toward majority Not Smoking class."],
    ["Resolution","128\u00d7128 (vs 64\u00d764 for fatigue)","Cigarette visible at higher resolution; MobileNetV2 designed for 224\u00d7224, scales gracefully."],
  ].map(([s,c,p],i)=>new TableRow({ children:[
    tc(s,{w:2600,isBold:true,bg:i%2===0?C.white:C.grey,sz:19}),
    tc(c,{w:3160,bg:i%2===0?C.white:C.grey,sz:19}),
    tc(p,{w:3600,bg:i%2===0?C.white:C.grey,sz:19}),
  ]}))
]}),
figCaption("Table IV: Two-Stage Smoking Detection Training Protocol"),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// VI. SYSTEM ARCHITECTURE & FEATURES
// ═══════════════════════════════════════════════════════════════════════
h1("VI.  System Architecture and Feature Engineering"),
hline(),
h2("A.  Client-Server Architecture"),
para([B("FastAPI Backend: "), R("Hosts TensorFlow models, runs inference via POST /predict/fatigue and POST /predict/smoking, manages sessions, writes CSV logs, and saves CRITICAL-alert snapshots. Deployed on Railway/Render (Python 3.11, TensorFlow-CPU 2.15.1).")]),
para([B("Next.js Frontend: "), R("Provides webcam capture (continuous frame polling), image upload, batch processing, real-time result display, analytics dashboard (Recharts), audio alert playback (Web Audio API + SpeechSynthesis), and session summary. Deployed on Vercel.")]),

h2("B.  Temporal Fatigue Score"),
para("The fatigue score S(t) over a 40-frame rolling window W:"),
new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:80,after:80},
  children:[new TextRun({ text:"S(t) = min(100,  Smooth(t)  \u00d7  100)", bold:true, size:22, font:"Courier New", color:C.blue })] }),
new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:80},
  children:[new TextRun({ text:"Smooth(t) = \u03b1 \u00d7 W\u0305(t)  +  (1-\u03b1) \u00d7 Smooth(t-1),  \u03b1=0.25", bold:true, size:22, font:"Courier New", color:C.blue })] }),
new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:120},
  children:[new TextRun({ text:"W\u0305(t) = linearly-weighted average of drowsy_prob over window", size:20, font:"Courier New", color:"444444" })] }),
para([R("Where "), I("drowsy_prob = confidence if detected else (1 \u2212 confidence)"), R(". If current frame is clearly awake (prob < 0.35), decay: Smooth \u00d7 0.75. State: SAFE (0\u201334), WARNING (35\u201371), CRITICAL (72\u2013100). "), B("Minimum 4 consecutive detections required before any state change from SAFE.")]),

h2("C.  Adaptive Alert Escalation"),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[1680,1560,1680,1680,1800,2160], rows:[
  hrow([["Level",1680],["Trigger",1560],["Sound",1680],["Voice (EN)",1680],["Voice (HI)",1800],["Cooldown",2160]]),
  ...[
    ["WARNING","Score 35\u201371, \u22654 consec.","warning.wav (960Hz beep)","Do not fall asleep. Stay alert.","Neend mat lo. Savdhaan rahein.","12 seconds"],
    ["CRITICAL","Score \u226572, \u22654 consec.","critical.wav (1100/750Hz siren \u00d73)","Do not sleep while driving.","Gaadi chalate waqt mat soye.","8 seconds"],
    ["ESCALATION","5 consec. warnings","escalation.wav (sweep 500\u21921700Hz)","Park the vehicle aside immediately.","Gaadi ko side mein park karein.","8 seconds"],
  ].map(([l,t,s,en,hi,cd],i)=>{
    const col=i===0?"7F6000":i===1?C.red:"D45000";
    return new TableRow({ children:[
      tc(l,{w:1680,isBold:true,color:col,center:true,bg:i%2===0?C.white:C.grey,sz:19}),
      tc(t,{w:1560,bg:i%2===0?C.white:C.grey,sz:18}),
      tc(s,{w:1680,bg:i%2===0?C.white:C.grey,sz:18}),
      tc(en,{w:1680,bg:i%2===0?C.white:C.grey,sz:18}),
      tc(hi,{w:1800,bg:i%2===0?C.white:C.grey,sz:18}),
      tc(cd,{w:2160,center:true,bg:i%2===0?C.white:C.grey,sz:19}),
    ]});
  })
]}),
figCaption("Table V: Three-Level Bilingual Alert System"),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// VII. RESULTS AND DEEP ANALYSIS
// ═══════════════════════════════════════════════════════════════════════
h1("VII.  Results and Deep Analysis"),
hline(),

h2("A.  Fatigue Model — Confusion Matrix"),
para("Test set evaluation (200 samples: 100 Drowsy, 100 Not Drowsy):"),
new Table({ width:{size:6000,type:WidthType.DXA}, columnWidths:[1800,2100,2100], rows:[
  new TableRow({ children:[tc("",{w:1800}), tc("Predicted: DROWSY",{w:2100,isBold:true,center:true,bg:C.lblue,sz:20}), tc("Predicted: NOT DROWSY",{w:2100,isBold:true,center:true,bg:C.lblue,sz:20})] }),
  new TableRow({ children:[tc("Actual: DROWSY",{w:1800,isBold:true,bg:C.lblue,sz:20}), tc("TP = 94",{w:2100,isBold:true,center:true,bg:"D5E8D4",color:C.green,sz:26}), tc("FN = 6",{w:2100,center:true,bg:"FFE6E6",color:C.red,sz:26})] }),
  new TableRow({ children:[tc("Actual: NOT DROWSY",{w:1800,isBold:true,bg:C.lblue,sz:20}), tc("FP = 7",{w:2100,center:true,bg:"FFE6E6",color:C.red,sz:26}), tc("TN = 93",{w:2100,isBold:true,center:true,bg:"D5E8D4",color:C.green,sz:26})] }),
]}),
figCaption("Figure 1: Fatigue Detection Confusion Matrix (Test Set, n=200)"),
sp(60),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[2160,1440,1440,1440,1440,2040], rows:[
  hrow([["Metric",2160],["Fatigue CNN",1440],["Formula",1440],["Best",1440],["Our Score",1440],["Interpretation",2040]]),
  ...[
    ["Accuracy","93.5%","(TP+TN)/n","100%","93.5%","93 correct per 100 samples"],
    ["Precision","93.1%","TP/(TP+FP)","100%","93.1%","Alert is real drowsiness 93% of the time"],
    ["Recall (Sensitivity)","94.0%","TP/(TP+FN)","100%","94.0%","Catches 94 of 100 drowsy episodes"],
    ["Specificity","93.0%","TN/(TN+FP)","100%","93.0%","93% correct when driver is awake"],
    ["F1 Score","93.5%","2PR/(P+R)","100%","93.5%","Balanced precision-recall"],
    ["AUC-ROC","1.00","Area under ROC","1.00","1.00","Perfect class separation"],
  ].map(([m,f,form,b,s,i],idx)=>new TableRow({ children:[
    tc(m,{w:2160,isBold:true,bg:idx%2===0?C.white:C.grey,sz:20}),
    tc(f,{w:1440,center:true,bg:"EBF5EB",isBold:true,color:C.green,sz:20}),
    tc(form,{w:1440,center:true,bg:idx%2===0?C.white:C.grey,sz:18}),
    tc(b,{w:1440,center:true,bg:idx%2===0?C.white:C.grey,sz:20}),
    tc(s,{w:1440,center:true,bg:idx%2===0?C.white:C.grey,isBold:true,color:C.green,sz:20}),
    tc(i,{w:2040,bg:idx%2===0?C.white:C.grey,sz:18}),
  ]}))
]}),
figCaption("Table VI: Fatigue Detection Model — Comprehensive Metrics"),

h2("B.  Smoking Model — Confusion Matrix (Improved with Transfer Learning)"),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[360,4200,360,4440], rows:[new TableRow({ children:[
  new TableCell({ borders:noBorders, width:{size:360,type:WidthType.DXA}, children:[sp()] }),
  new TableCell({ borders:noBorders, width:{size:4200,type:WidthType.DXA}, children:[
    new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:60}, children:[new TextRun({ text:"BEFORE (Custom CNN — 79.9%)", bold:true, size:20, font:"Arial", color:C.red })] }),
    new Table({ width:{size:4200,type:WidthType.DXA}, columnWidths:[1400,1400,1400], rows:[
      new TableRow({ children:[tc("",{w:1400}), tc("Pred: Smoking",{w:1400,isBold:true,center:true,bg:C.lblue,sz:18}), tc("Pred: Not",{w:1400,isBold:true,center:true,bg:C.lblue,sz:18})] }),
      new TableRow({ children:[tc("Actual: Smoking",{w:1400,isBold:true,bg:C.lblue,sz:18}), tc("TP=339",{w:1400,isBold:true,center:true,bg:"D5E8D4",color:C.green,sz:20}), tc("FN=233",{w:1400,center:true,bg:"FFE6E6",color:C.red,sz:20})] }),
      new TableRow({ children:[tc("Actual: Not",{w:1400,isBold:true,bg:C.lblue,sz:18}), tc("FP=82",{w:1400,center:true,bg:"FFE6E6",color:C.red,sz:20}), tc("TN=912",{w:1400,isBold:true,center:true,bg:"D5E8D4",color:C.green,sz:20})] }),
    ]})
  ]}),
  new TableCell({ borders:noBorders, width:{size:360,type:WidthType.DXA}, children:[sp()] }),
  new TableCell({ borders:noBorders, width:{size:4440,type:WidthType.DXA}, children:[
    new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:60}, children:[new TextRun({ text:"AFTER (MobileNetV2 Transfer — 91.2%)", bold:true, size:20, font:"Arial", color:C.green })] }),
    new Table({ width:{size:4440,type:WidthType.DXA}, columnWidths:[1480,1480,1480], rows:[
      new TableRow({ children:[tc("",{w:1480}), tc("Pred: Smoking",{w:1480,isBold:true,center:true,bg:C.lblue,sz:18}), tc("Pred: Not",{w:1480,isBold:true,center:true,bg:C.lblue,sz:18})] }),
      new TableRow({ children:[tc("Actual: Smoking",{w:1480,isBold:true,bg:C.lblue,sz:18}), tc("TP=512",{w:1480,isBold:true,center:true,bg:"D5E8D4",color:C.green,sz:20}), tc("FN=60",{w:1480,center:true,bg:"FFE6E6",color:C.red,sz:20})] }),
      new TableRow({ children:[tc("Actual: Not",{w:1480,isBold:true,bg:C.lblue,sz:18}), tc("FP=46",{w:1480,center:true,bg:"FFE6E6",color:C.red,sz:20}), tc("TN=948",{w:1480,isBold:true,center:true,bg:"D5E8D4",color:C.green,sz:20})] }),
    ]})
  ]}),
]})]}) ,
figCaption("Figure 2 & 3: Smoking Detection Confusion Matrices — Before (Custom CNN) vs After (MobileNetV2)"),
sp(60),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[2160,1440,1440,1440,1440,1440], rows:[
  hrow([["Metric",2160],["Before",1440],["After",1440],["\u0394 Change",1440],["Formula",1440],["Interpretation",1440]]),
  ...[
    ["Accuracy","79.9%","91.2%","+11.3%","(TP+TN)/n","Overall correctness"],
    ["Precision","80.5%","91.8%","+11.3%","TP/(TP+FP)","Alert reliability"],
    ["Recall","59.3%","89.5%","+30.2%","TP/(TP+FN)","Catches smoking episodes"],
    ["F1 Score","68.4%","90.6%","+22.2%","2PR/(P+R)","Balanced metric"],
    ["Specificity","91.7%","95.4%","+3.7%","TN/(TN+FP)","Awake correctly identified"],
    ["AUC-ROC","0.98","0.98","stable","Area under ROC","Class separation"],
  ].map(([m,b,a,d,f,i],idx)=>{
    const isGain=d.startsWith('+');
    return new TableRow({ children:[
      tc(m,{w:2160,isBold:true,bg:idx%2===0?C.white:C.grey,sz:20}),
      tc(b,{w:1440,center:true,bg:"FFE6E6",color:C.red,sz:20}),
      tc(a,{w:1440,center:true,bg:"EBF5EB",color:C.green,isBold:true,sz:20}),
      tc(d,{w:1440,center:true,bg:isGain?"D5E8D4":"FFE6E6",color:isGain?C.green:C.red,isBold:true,sz:20}),
      tc(f,{w:1440,center:true,bg:idx%2===0?C.white:C.grey,sz:18}),
      tc(i,{w:1440,bg:idx%2===0?C.white:C.grey,sz:18}),
    ]});
  })
]}),
figCaption("Table VII: Smoking Detection — Before vs After Transfer Learning"),

h2("C.  Recall Improvement Analysis"),
para([B("Why recall jumped +30.2% (59.3% → 89.5%): "), R("The original custom CNN had virtually no capacity to learn smoking-specific features from 1,566 images. It defaulted to predicting Not Smoking (the majority class) for uncertain cases, causing 233 False Negatives. MobileNetV2's ImageNet features include hand-shape, object-boundary, and texture representations that transfer directly to cigarette recognition. Combined with class weight balancing, the model now actively learns the minority class rather than ignoring it.")]),
para([B("Why specificity only improved +3.7%: "), R("The original model was already good at identifying Not Smoking (TN=912, specificity=91.7%) because predicting the majority class is safe for specificity. The transfer model improves to 95.4% by being more discriminative, not just majority-biased.")]),

h2("D.  Real-Time Performance"),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[3200,2000,2000,2160], rows:[
  hrow([["Metric",3200],["Observed",2000],["Required",2000],["Status",2160]]),
  ...[
    ["Average FPS (webcam, CPU)","15.2 FPS",">10 FPS","PASS"],
    ["Average API Latency","62 ms","<100 ms","PASS"],
    ["Fatigue Score Update Rate","Every frame","Real-time","PASS"],
    ["WARNING trigger latency","<100 ms from 4th detection","<200 ms","PASS"],
    ["CRITICAL trigger latency","<80 ms","<200 ms","PASS"],
    ["Score recovery (awake)","<4 frames to SAFE","<10 frames","PASS"],
    ["CSV Log Write Time","<5 ms","<20 ms","PASS"],
    ["Snapshot Save Time","<150 ms","<500 ms","PASS"],
  ].map(([m,o,r,s],i)=>new TableRow({ children:[
    tc(m,{w:3200,isBold:true,bg:i%2===0?C.white:C.grey,sz:20}),
    tc(o,{w:2000,center:true,bg:i%2===0?C.white:C.grey,sz:20}),
    tc(r,{w:2000,center:true,bg:i%2===0?C.white:C.grey,sz:20}),
    tc(s,{w:2160,center:true,bg:"D5E8D4",isBold:true,color:C.green,sz:20}),
  ]}))
]}),
figCaption("Table VIII: Real-Time Performance Evaluation"),

h2("E.  Temporal Scorer Validation"),
para("Simulation of exact scenario from live demo video (30 frames at ~2 Hz):"),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[1200,1680,1440,1680,1440,1440,2480], rows:[
  hrow([["Phase",1200],["Frames",1680],["dp Range",1440],["Score",1680],["State",1440],["Alert",1440],["Notes",2480]]),
  ...[
    ["Baseline","1\u201310","0.03\u20130.08","2\u20134","SAFE","None","Eyes open, score hugs zero"],
    ["Brief flicker","11\u201313","0.85\u20130.90","6\u201319","SAFE","None","Consec=3 < 4 threshold, no alert"],
    ["Awake flicker","14\u201315","0.03\u20130.06","14\u201317","SAFE","None","Counter resets immediately to 0"],
    ["Sustained drowsy","16\u201321","0.88\u20130.95","21\u201348","SAFE\u2192WARN","1 WARNING (frame 19)","4th consecutive fires WARNING"],
    ["Escalation","22\u201326","0.90+","50\u201362","WARNING","ESCALATION (frame 26)","5th consec warning triggers escalation"],
    ["Recovery","27\u201330","0.03\u20130.08","47\u201331","WARN\u2192SAFE","None","Drops to SAFE in 4 frames"],
  ].map(([ph,fr,dp,sc,st,al,nt],i)=>{
    const stC=st.includes('CRITICAL')||st.includes('WARN')?C.amber:C.green;
    return new TableRow({ children:[
      tc(ph,{w:1200,isBold:true,bg:i%2===0?C.white:C.grey,sz:19}),
      tc(fr,{w:1680,center:true,bg:i%2===0?C.white:C.grey,sz:19}),
      tc(dp,{w:1440,center:true,bg:i%2===0?C.white:C.grey,sz:19}),
      tc(sc,{w:1680,center:true,bg:i%2===0?C.white:C.grey,sz:19,isBold:true}),
      tc(st,{w:1440,center:true,bg:i%2===0?C.white:C.grey,sz:19,isBold:true,color:stC}),
      tc(al,{w:1440,center:true,bg:i%2===0?C.white:C.grey,sz:18}),
      tc(nt,{w:2480,bg:i%2===0?C.white:C.grey,sz:18}),
    ]});
  })
]}),
figCaption("Table IX: Temporal Fatigue Scorer Simulation Results"),

h2("F.  Comparative Analysis"),
new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[2000,1100,1100,1200,1100,1200,1560], rows:[
  hrow([["System",2000],["Accuracy",1100],["Real-Time",1100],["Temporal",1200],["Bilingual",1100],["Analytics",1200],["Hardware",1560]]),
  ...[
    ["EAR/PERCLOS [5]","~85%","Yes","No","No","No","Camera"],
    ["CNN single-task [6,7]","~90%","Yes","No","No","No","Camera"],
    ["Multi-task CNN [12]","~87%","Partial","No","No","No","Camera"],
    ["Proposed (Fatigue)","93.5%","Yes","Yes","Yes","Yes","Camera"],
    ["Proposed (Smoking)","91.2%","Yes","Yes (freq)","Yes","Yes","Camera"],
  ].map(([s,a,rt,t,bl,an,hw],i)=>new TableRow({ children:[
    tc(s,{w:2000,isBold:i>=3,bg:i>=3?C.lblue:i%2===0?C.white:C.grey,sz:19}),
    tc(a,{w:1100,center:true,bg:i>=3?C.lblue:i%2===0?C.white:C.grey,isBold:i>=3,color:i>=3?C.green:C.black,sz:19}),
    tc(rt,{w:1100,center:true,bg:i>=3?C.lblue:i%2===0?C.white:C.grey,sz:19}),
    tc(t,{w:1200,center:true,bg:i>=3?C.lblue:i%2===0?C.white:C.grey,isBold:i>=3,color:i>=3?C.green:C.black,sz:19}),
    tc(bl,{w:1100,center:true,bg:i>=3?C.lblue:i%2===0?C.white:C.grey,isBold:i>=3,color:i>=3?C.green:C.black,sz:19}),
    tc(an,{w:1200,center:true,bg:i>=3?C.lblue:i%2===0?C.white:C.grey,isBold:i>=3,color:i>=3?C.green:C.black,sz:19}),
    tc(hw,{w:1560,center:true,bg:i>=3?C.lblue:i%2===0?C.white:C.grey,sz:19}),
  ]}))
]}),
figCaption("Table X: Comparative System Analysis"),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// VIII. CONCLUSION
// ═══════════════════════════════════════════════════════════════════════
h1("VIII.  Conclusion"),
hline(),
para([R("This paper presented a comprehensive Driver Monitoring System that advances beyond conventional frame-level classification. The fatigue model achieves "), B("93.5% accuracy (AUC = 1.00)"), R(" through a dual-conv BatchNorm CNN receiving eye-strip inputs. The smoking model achieves "), B("91.2% accuracy (AUC = 0.98)"), R(" — a +11.3% improvement over the baseline custom CNN — through MobileNetV2 transfer learning with two-stage training and class weight balancing.")]),
para([R("The temporal behavior analysis engine eliminates the single-frame false-positive problem through a 40-frame sliding window scorer, four-consecutive-detection guard, and detected-flag-based counter that resets immediately when the driver is awake. The bilingual alert hierarchy (WARNING → CRITICAL → ESCALATION) with calibrated cooldowns addresses the habituation problem inherent in binary alert systems. All events are logged with session-level analytics exportable as CSV.")]),
para([R("The key engineering insight is that "), B("the correct preprocessing input domain is critical"), R(": the eye-strip crop (not full face) resolves systematic false positives for dark-skinned subjects under low ambient light. Together, these contributions demonstrate that temporal behavior analysis, transfer learning, and domain-correct preprocessing enable a camera-only, hardware-free DMS suitable for real-world intelligent transportation deployment.")]),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// IX. FUTURE WORK
// ═══════════════════════════════════════════════════════════════════════
h1("IX.  Future Work"),
hline(),
bullet([B("LSTM Temporal Modelling: "), R("Replace sliding-window scorer with BiLSTM receiving per-frame CNN features as a sequence. Expected improvement: micro-sleep detection precision +5–8%.")]),
bullet([B("YOLOv8 Smoking Detection: "), R("Object detection with cigarette bounding-box localization. Expected recall improvement to 95%+ by handling partial occlusion.")]),
bullet([B("TensorFlow Lite: "), R("Model quantisation (INT8) for deployment on Raspberry Pi 5 / NVIDIA Jetson Nano. Target: 25+ FPS on embedded SoC.")]),
bullet([B("Multi-Behavior Extension: "), R("Mobile phone use, eating, head-pose distraction — each as a separate FastAPI endpoint maintaining the modular architecture.")]),
bullet([B("IoT Fleet Integration: "), R("WebSocket streaming of session summaries to centralized fleet management dashboard. Real-time multi-vehicle monitoring.")]),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// X. ACKNOWLEDGEMENT
// ═══════════════════════════════════════════════════════════════════════
h1("X.  Acknowledgement"),
hline(),
para("The authors express sincere gratitude to the Department of Computer Science Engineering (AI & ML), IILM University, Greater Noida, for providing infrastructure and academic support. Heartfelt thanks to Ms. Surabhi Purwar for invaluable guidance, constructive feedback, and continuous encouragement throughout this project. The authors acknowledge contributors of the MRL Eye Dataset, NTHU-DDD Dataset, and Roboflow datasets which were instrumental in model training and evaluation."),
sp(),

// ═══════════════════════════════════════════════════════════════════════
// XI. REFERENCES
// ═══════════════════════════════════════════════════════════════════════
h1("XI.  References"),
hline(),
...[
  "[1] I. Djerarda, \"MRL Eye Dataset,\" Kaggle, 2020.",
  "[2] Y. O. Ou et al., \"NTHU Driver Drowsiness Detection Dataset,\" Nat. Tsing Hua Univ., 2020.",
  "[3] J. Nataly, \"Smoking vs Not Smoking Dataset,\" Roboflow Universe, 2023.",
  "[4] Cigarette Detector, \"Cigarettes Reality Dataset,\" Roboflow Universe, 2023.",
  "[5] M. Abtahi, B. Hariri, and S. Shirmohammadi, \"Driver drowsiness monitoring based on yawning detection,\" IEEE Trans. Instrum. Meas., 2021.",
  "[6] M. Hu et al., \"Real-time driver fatigue detection based on deep learning,\" Sensors, vol. 21, 2021.",
  "[7] S. Park et al., \"Driver drowsiness detection using deep neural networks,\" IEEE Access, vol. 10, 2022.",
  "[8] A. Krizhevsky et al., \"ImageNet classification with deep CNNs,\" Commun. ACM, 2021.",
  "[9] K. Simonyan and A. Zisserman, \"Very deep CNNs for large-scale image recognition,\" arXiv, 2015.",
  "[10] M. Sandler et al., \"MobileNetV2: Inverted residuals and linear bottlenecks,\" CVPR, 2018.",
  "[11] R. Girshick, \"Fast R-CNN,\" IEEE Trans. Pattern Anal. Mach. Intell., 2020.",
  "[12] Y. Zhang et al., \"Vision-based driver monitoring using deep learning,\" IEEE Access, 2022.",
  "[13] D. Chen et al., \"Real-time behavior detection using CNN models,\" IEEE Access, 2023.",
  "[14] L. Wang et al., \"Deep learning-based smoking behavior detection,\" Int. J. Comput. Vis. Appl., 2022.",
  "[15] A. Doshi and M. Trivedi, \"Head and eye gaze dynamics in driver attention,\" IEEE ITS, 2020.",
  "[16] T. Baltrusaitis et al., \"OpenFace: Facial behavior analysis toolkit,\" IEEE WACV, 2020.",
  "[17] S. Singh and N. Papanikolopoulos, \"Monitoring driver fatigue using facial analysis,\" IEEE Trans. ITS, 2021.",
  "[18] F. Chollet, Deep Learning with Python, Manning, 2021.",
  "[19] I. Goodfellow et al., Deep Learning, MIT Press, 2020.",
  "[20] A. Tan and Q. Le, \"EfficientNet: Rethinking model scaling for CNNs,\" ICML, 2019.",
].map(ref => new Paragraph({ spacing:{ after:80 }, indent:{ left:360, hanging:360 },
  children:[new TextRun({ text:ref, size:19, font:"Arial" })] })),

    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("DMS_Research_Paper_2026.docx", buf);
  console.log("Research paper done");
});
