# Changelog

Changelog for the HRA Knowledge Graph Release Notes

## 2.1 - 2024-06-15

### Added in 2.1
**The following were new or revised with ccf-release v2.1:**

**Reference organs**
*all male and female organs were re-exported to include the node types as organizational, mesh or surface

**ASCT+B tables**
* **13 ASCT+B tables had minor revisions:** :blood, bone marrow, brain, heart, fallopian tube, kidney, knee, liver, lung, lymph node, main bronchus, ovary, palatine tonsil.
* **6 ASCT+B tables had major revisions:** : blood vasculature,lymph vasculature, peripheral nervous system,  placenta, muscular system, and skeleton
* 
* **Crosswalks**
* **6 new crosswalk tables were added:** pathway crosswalk, lymph vasculature to organ crosswalk, peripheral nervous system to organ crosswalk, azimuth crosswalk, celltypist crosswalk, popv crosswalk
* **2 revised crosswalk table:** 1 blood vasculature to organ crosswalk, 3D models crosswalk

**Organ Mapping Antibody Panels (OMAPs)**
* * **13 Organ Mapping Antibody Panels (OMAPs) were revised:**
  - OMAP-1 through OMAP-13 were revised to use new template fields to match antibody validation report fields: target_name to target_symbol, dilution to dilution_factor, author_orcid to author_orcids

* **8 NEW Organ Mapping Antibody Panels (OMAPs) were added:**
   - Cyclic immunofluorescence (CyCIF) panel for kidney
   - CODEX panels that increase the number of markers and cell types detected and optimize for FFPE tissue preservation for intestine and lung
   - IBEX panels for thymus and palatine tonsil
   - a sequential IBEX and CellDIVE panel for lymph node
   - MICS panel for palatine tonsil from FFPE preserved tissue
   - the firsts sequential imaging mass spectrometry followed by cyclic immunofluorescence panel

## 2.0 - 2023-12-15

### Added in 2.0

**The following were new or revised with ccf-release v2.0:** 

**Reference organs**
* male and female pancreas-change borders of head/neck but no additional anatomical structures were added.
* male and female brain model licensing was updated to Creative Commons Attribution 4.0 International (CC BY 4.0)
* united male & female bodies revised to include pancreas revisions.

**2D FTU illustrations**

* **1 new 2D functional tissue unit (FTU) reference illustrations was added**
* - **small intestine:** intestinal villus
* **1 major revision to a 2D functional tissue unit (FTU) reference illustrations**
* - **kidney** nephron- three insets were added: inner and outer medullary and cortical collecting ducts and regional areas of the kidney were adjusted to reflect the ratio of the stripes against KPMP measurements.
* 20 minor revisions were also made to fix all 2D illustrations to correct overlapping labels or labels in different layers of the ai file and to correct missing colors in some sections of the illustrations to use the svg file to support the interactive Functional Tissue Unit (FTU) Explorer.
  
**ASCT+B tables**

* **2 ASCT+B table were added:** anatomical systems and palatine tonsil
* **13 ASCT+B tables had minor revisions:** :bone marrow, brain, heart, fallopian tube, kidney; liver, lung; lymph node, main bronchus, pancreas, prostate, skin, and thymus.
* **7 ASCT+B tables had major revisions:** : blood vasculature, knee,lymph vasculature, peripheral nervous system,  placenta, muscular system, and skeleton
  
**Crosswalks**
* 1 Musculoskeletal crosswalk table was added
* 1 Blood Vessel Geometry table was revised
* 1 Blood vasculature to organ crosswalk was revised
* 3D models crosswalk- revised to match model revisions
* 2D crosswalk was revised to correct cell types in the coritcal collecting duct mislabelled as connecting duct, updates to cell types recently added to Cell ontology


**Organ Mapping Antibody Panels (OMAPs)**

* **2 Organ Mapping Antibody Panels (OMAPs) were revised:**
  - OMAP-2 Intestines CODEX correct the RRID for CDX2 is AB_2864405, AE1/AE3 pan cytokeratin was corrected from KRT17 to detecting KRT1, KRT2, KRT3, KRT4, KRT5, KRT7, KRT8KRT10, KRT14, KRT15, KRT16, KRT19, 
  - OMAP-9 Kidney CODEX—updated author list to include, correct spelling for names

* 
## 1.4 - 2023-06-15

### Added in 1.4

**The following reference organs were added with ccf-release v1.4:** 

* left/right female and male palatine tonsil
* separateing out larynx, trachea, main bronchus from male and female lung model
* extensive updates to left/right female and male eye models; the levator palpebrae superioris muscle was removed and the long posterior ciliary artery was added.
  
* **7 ASCT+B tables were revised:** blood vasculature; blood vasculature; brain; eye; kidney; lung; lymph vasculature.
* **3 ASCT+B tables were added:** skeleton, muscular system and spinal cord
* **1 Blood Vessel Geometry table was added**
* **1 Blood vasculature to organ crosswalk was added** This table provides a crosswalk from vessels in the blood vasculature ASCT+B table to anatomical structures in kidney,lung and pancreas ASCT+B tables. 

* **2 2D functional tissue unit (FTU) reference illustrations were added** to support the interactive Functional Tissue Unit (FTU) Explorer.
  - **spleen:** red pulp, white pulp
  
* **7 Organ Mapping Antibody Panels (OMAPs) were revised:**
  - standardize use of HGNC approved symbol for target_name to conform with the Human Protein Atlas
  - standardize vendor name across all tables
  - include OMAP_id, organ name and the uberon ontology ID per row
  - representative datasets are referenced that use these panels
    
* **6 NEW Organ Mapping Antibody Panels (OMAPs) were added:**
   - Imaging Mass Cytometry panel for placenta full term
   - CODEX panels that significantly expand anatomy and cell types detected for kidney, pancreas
   - IBEX panels for spleen, retina
   - MACSima panel for palatine tonsil

## 1.3 - 2022-12-15

### Added in 1.3
**The following reference organs were added with ccf-release v1.3:** 
* left/right female mammary glands
* update to skin to accommodate addition of mammary glands and future skeletal muscle additions in legs
* landmark organs added for mammary gland registration user interface (RUI) support: sternum, manubrium, xiphoid process, axillary tail of breast, lower outer quadrant of breast, lower inner quadrant of breast, upper outer quadrant of breast, lower inner quadrant of breast

* **13 ASCT+B tables were revised:** blood; blood vasculature; bone marrow; brain; eye; heart; large intestine; lymph vasculature; ovary; pancreas; small intestine, spleen; thymus
* **19 2D functional tissue unit (FTU) reference illustrations were added** to support the interactive Functional Tissue Unit (FTU) Explorer.
  - **kidney:** nephron, renal corpuscle, cortical collecting duct, outer medullary collecting duct, inner medullary collecting duct, thick ascending loop of Henle, thin ascending loop of Henle, thin descending loop of Henle
  - **large intestine:** crypt of Lieberkuhn
  - **liver:** liver lobule
  - **lung:** alveoli, bronchial submucosal gland
  - **pancreas:** acinus, islets of Langerhans, intercalated duct
  - **prostate:** prostate glandular acinus
  - **skin:** epidermal ridge, dermal papilla
  - **thymus:** thymus lobule


## 1.2 - 2022-06-15

### Added in 1.2
The following reference organs were added with ccf-release v1.2:

* spinal cord, placenta, small intestine measurements

Changes to ccf-release v1.0 models include: 
* Adjustments were made to the skin to account for the verterbral column and eventual addition of female breasts and gatrocnemius muscles. 
* The renal pelvis, major and minor calyxes, were added to the ureter model to better reflect the ontology distinction between kidney and ureter. 
* The nerves, ducts, muscles, some ligaments, and vasculature for organs are split according to 3D Reference Objects. Since these splittings were for UI/back-end reasons, while certain vessels are associated with many organs as general pathways, any one vessel is only ever in one blood vasculature “group”.

* **8 2D functional tissue unit (FTU) reference illustrations were added** to support Functional Tissue Unit (FTU) Explorer.
  - **kidney:** nephron, renal corpuscle
  - **large intestine:** crypt of Lieberkuhn
  - **liver:** liver lobule
  - **lung:** alveolus
  - **pancreas:** islets of Langerhans
  - **prostate:** prostate glandular acinus
  - **thymus:** thymus lobule
 
* **6 NEW Organ Mapping Antibody Panels (OMAPs)** were added:
  - CODEX panels for intestines, kidney, pancreas
  - CellDIVE panels for skin, lung
  - SIMS panel for liver

## 1.1 - 2021-12-01

### Added in 1.1

* **11 revised ASCT+B tables:** blood/bone marrow; brain; heart; kidney; large intestine; lung; lymph node; skin; spleen; thymus; vasculature
* **13 3D reference objects from female visible human project:** pelvic bone (blood/bone marrow); brain; heart; left/right kidney; large intestine; lung; left/right lymph node (popliteal); skin, spleen; thymus; vasculature
* **13 3D reference objects from male visible human project:** pelvic bone (blood/bone marrow); brain; heart; left/right kidney; large intestine; lung; left/right lymph node (popliteal); skin, spleen; thymus; vasculature

* **11 new reference organs;  26 3D reference objects:** were added as follows: eye; fallopian tube; knee; liver; ovary; pancreas; prostate; small intestine; ureter; urinary bladder; uterus

* **Organ Mapping Antibody Panel (OMAPs)** for IBEX human lymph node

**Changes to ccf-release v1.0 models include:**

* All female models (with exception to the Allen Brain) were stretched in the Z-axis to accommodate for an error introduced by a derivative visible human dataset for v1.0. The original visible human data was used to rescale v1.1 models.
* The male and female Allen Brains were scaled, repositioned, and rotated to better fit the skin and align with the new eye models
* Vasculature for the uterus, eye, and liver was added to the vasculature model
* The optic chiasm was added to the Allen Brain models
* The nerves, ducts, muscles, some ligaments, and vasculature for organs are split according to 3D Reference Objects. Since these splittings were for UI/back-end reasons, while certain vessels are associated with many organs as general pathways, any one vessel is only ever in one blood vasculature “group”.
* The partial ureters were removed from the v1.0 kidney models as a complete ureter organ is now available
* The heart models now include complete aortas and no longer include the left common carotid, brachiocephalic trunk, or left subclavian. These vessels are also included in the complete blood vasculature model.
*  Minor adjustments were made to several vessels, the skin, and the large intestine to accommodate the new organs.




## 1.0 - 2021-03-12

### Added in 1.0
* **11 ASCT+B tables:** blood/bone marrow; brain; heart; kidney; large intestine; lung; lymph node; skin; spleen; thymus; vasculature
* **13 3D reference objects from female visible human project:** pelvic bone (blood/bone marrow); brain; heart; left/right kidney; large intestine; lung; left/right lymph node (popliteal); skin, spleen; thymus; vasculature
* **13 3D reference objects from male visible human project:** pelvic bone (blood/bone marrow); brain; heart; left/right kidney; large intestine; lung; left/right lymph node (popliteal); skin, spleen; thymus; vasculature

