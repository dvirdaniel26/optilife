# Design System

### Colors
| Preview | Role | Color Code (Hex) | Usage |
| :---: | :--- | :--- | :--- |
| <img src="https://placehold.co/24x24/1E1E2D/1E1E2D.png" width="24" height="24"> | **Primary** | `#1E1E2D` | Dark Navy Blue: For body text, headings, and icons to ensure maximum readability. |
| <img src="https://placehold.co/24x24/00A8B5/00A8B5.png" width="24" height="24"> | **Secondary** | `#00A8B5` | Turquoise: For graphs, scales, and normal metrics. Conveys innovation and technology. |
| <img src="https://placehold.co/24x24/FDE047/FDE047.png" width="24" height="24"> | **Accent** | `#FDE047` | Lemon Yellow: For prominent action buttons (like "Upload Test") to indicate an urgent action. |
| <img src="https://placehold.co/24x24/FDFBF7/FDFBF7.png" width="24" height="24"> | **Background** | `#FDFBF7` | Soft Cream: The main site background that creates a calming and non-threatening Wellness atmosphere. |
| <img src="https://placehold.co/24x24/FFFFFF/FFFFFF.png" width="24" height="24" style="border: 1px solid #ccc;"> | **Text** | `#FFFFFF` | Pearl White: For information cards and the dashboard, to create cleanliness and visual separation. |
| <img src="https://placehold.co/24x24/10B981/10B981.png" width="24" height="24"> | **Error** | `#10B981` | Green: To indicate success in the program and metrics within the normal range. |
| <img src="https://placehold.co/24x24/EF4444/EF4444.png" width="24" height="24"> | **Success** | `#EF4444` | Red: For alerts on medical abnormalities in blood tests that require attention. |

### Typography
| Preview | Role | Font Name | Size / Weight |
| :--- | :--- | :--- | :--- |
| <h1 style="font-family: 'Assistant', sans-serif; font-size: 32px; font-weight: bold; margin: 0;">Heading 1</h1> | **Heading** | Assistant | 32px / Bold |
| <p style="font-family: 'Heebo', sans-serif; font-size: 18px; font-weight: normal; margin: 0;">This is a paragraph of body text.</p> | **Body** | Heebo | 18px / Regular |
| <span style="font-family: 'Heebo', sans-serif; font-size: 14px; font-weight: 500; color: gray;">Caption / Label</span> | **Caption / Label** | Heebo | 14px / Medium |

### Spacing
| Preview | Role | Size |
| :---: | :--- | :--- |
| <img src="https://placehold.co/32x8/00A8B5/00A8B5.png" width="32" height="8"> | **Base Unit** | 8px |

### Border Radius
| Preview | Role | Size |
| :---: | :--- | :--- |
| <img src="https://placehold.co/32x32/1E1E2D/1E1E2D.png" width="32" height="32" style="border-radius: 16px;"> | **General** | 16px |

### Component Styles
| Component | Style Description | Visual Concept |
| :--- | :--- | :--- |
| **Buttons** | Rounded edges. Primary button in yellow (#FDE047) with dark text. Secondary buttons with a thin turquoise (#00A8B5) border. | <button style="background-color: #FDE047; color: #1E1E2D; border: none; border-radius: 16px; padding: 10px 20px; font-weight: bold; cursor: pointer;">Upload Test</button> <button style="background-color: transparent; color: #00A8B5; border: 2px solid #00A8B5; border-radius: 16px; padding: 8px 18px; font-weight: bold; margin-left: 8px;">Cancel</button> |
| **Cards** | Clean white background, rounded corners and a very subtle shadow that adds depth over the cream background. | <div style="background-color: #FFFFFF; border-radius: 16px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;"><h4 style="margin:0; color: #1E1E2D;">Medical Record</h4><small style="color: gray;">Last updated today</small></div> |
| **Inputs** | White background, subtle gray border and internal spacing. On focus, the border turns prominent turquoise. | <input type="text" placeholder="Enter patient ID..." style="padding: 10px; border: 2px solid #ccc; border-radius: 8px; outline-color: #00A8B5; width: 100%;"> |
| **Navigation** | Wide menu in white or very light cream. Active item is highlighted with a vertical turquoise line and text color change. | <div style="display: flex; flex-direction: column; gap: 10px; color: gray; font-weight: bold; background: #FFFFFF; padding: 10px; border-radius: 8px;"><div style="color: #00A8B5; border-left: 3px solid #00A8B5; padding-left: 8px;">📊 Dashboard</div><div style="padding-left: 11px;">⚙️ Settings</div></div> |
