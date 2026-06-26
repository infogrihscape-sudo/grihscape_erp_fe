import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────
export interface CDRFEditorProps {
  /** Modules array used only for initialization. Pass a new `key` prop to force re-mount with fresh data. */
  initialModules: any[] | null;
  onChange: (modules: any[]) => void;
  readOnly?: boolean;
}

// ─── Color tokens ─────────────────────────────────────────────────
const C = {
  navy:        "var(--accent, #b89047)",
  navyDark:    "var(--sidebar-bg, #111217)",
  navyMid:     "var(--accent-dark, #9e7735)",
  orange:      "var(--accent, #b89047)",
  orangeLight: "rgba(184, 144, 71, 0.1)",
  white:       "var(--card-bg, #FFFFFF)",
  grey50:      "var(--hover-bg, #F5F6F8)",
  grey100:     "var(--border-subtle, #EAECF0)",
  grey200:     "var(--border, #D0D3D9)",
  grey300:     "var(--text-muted, #B0B5BF)",
  grey400:     "var(--text-muted, #9CA3AF)",
  grey500:     "var(--text-secondary, #6B7280)",
  grey600:     "var(--text-secondary, #5A5E6B)",
  grey800:     "var(--text-primary, #1A1A2E)",
  green:       "#16A34A", red: "#DC2626", amber: "#D97706",
} as const;


// ─── Template builder ─────────────────────────────────────────────
export function buildCDRFTemplate(): any[] {
  const uid = () => Math.random().toString(36).slice(2);
  const cb  = (items: string[]) => items.map(label => ({ id: `cb_${uid()}`, label, checked: false, custom: false }));
  const tf  = (label: string, placeholder = '') => ({ id: `tf_${uid()}`, type: 'text', label, value: '', placeholder });
  const cbg = (label: string, items: string[], cols = 3) =>({ id: `cbg_${uid()}`, type: 'checkbox_grid', label, cols, items: cb(items) });
  const matrix = (label: string, items: string[]) => ({ id: `mx_${uid()}`, type: 'requirement_matrix', label, items: items.map(r => ({ id: `mr_${uid()}`, label: r, must: false, nice: false, future: false })) });
  const rating = (label: string, items: string[]) => ({ id: `rt_${uid()}`, type: 'rating_scale', label, items: items.map(r => ({ id: `ri_${uid()}`, label: r, value: null })) });
  const yn     = (label: string, items: string[]) => ({ id: `yn_${uid()}`, type: 'yes_no_table', label, items: items.map(r => ({ id: `yi_${uid()}`, label: r, value: null })) });
  const notes  = (label = 'Additional Notes / Observations') => ({ id: `nt_${uid()}`, type: 'textarea', label, value: '', custom: false });
  const sec    = (id: string, label: string, fields: any[], duplicable = false) => ({ id, label, enabled: true, duplicable, order: 0, instanceIndex: 1, duplicatedFrom: null, fields });

  return [
    {
      id: 'mod_a', label: 'Module A', title: 'Client & Project Discovery',
      subtitle: 'Project Information · Client Profile · Family Requirements · Design Aspirations',
      enabled: true, collapsed: false,
      sections: [
        sec('sec_a1', 'A1 — Project Information', [
          tf('Project Name'), tf('Project Reference Code'),
          tf('Site Address (Line 1)'), tf('Site Address (Line 2)'),
          tf('City / District'), tf('State / PIN Code'),
          tf('Plot Area (sqft)'), tf('Built-Up Area (sqft)'), tf('Super Built-Up Area (sqft)'),
          tf('Number of Floors'), tf('Floor Plate Height (ft)'), tf('Front Road Width (ft)'),
          cbg('Project Type (select one)', ['Residential — Independent','Residential — Villa','Residential — Apartment','Commercial — Office','Commercial — Retail','Hospitality — Hotel / Resort','Hospitality — Restaurant / Cafe','Mixed Use','Institutional','Industrial / Warehouse'], 3),
          cbg('Services Required (select all that apply)', ['Architecture','Structural Design','Interior Design','Turnkey Construction','Project Management Consultancy (PMC)','Renovation / Retrofit','Landscape Design','MEP Design','Vastu Consultation','3D Visualisation Only'], 3),
          cbg('Facing Direction', ['North Facing','South Facing','East Facing','West Facing','North-East','North-West','South-East','South-West'], 4),
          notes(),
        ]),
        sec('sec_a2', 'A2 — Client Information', [
          tf('Primary Client Name'), tf('Spouse / Partner Name'),
          tf("Father's Name"), tf("Mother's Name"),
          tf('Contact Number (Primary)'), tf('Contact Number (Secondary)'),
          tf('Email Address'), tf('WhatsApp Number'),
          tf('Preferred Contact Mode'), tf('Preferred Meeting Time'),
          cbg('Pet Requirements', ['Dog — Small','Dog — Large','Cat','Birds / Aquarium','No Pets','Future Pet Likely'], 3),
          cbg('Accessibility & Special Needs', ['Elderly Resident — Mobility Support Required','Wheelchair Access Required','Visual Impairment Considerations','Hearing Impairment Considerations','Young Children — Safety Provisions','Medical Equipment Storage','No Special Requirements'], 3),
          cbg('Future Family Planning', ['Family Expansion Expected — 1-3 Years','Family Expansion Expected — 3-5 Years','Elderly Parents Moving In','Child Marriage / New Family Unit','No Changes Anticipated'], 3),
          notes(),
        ]),
        sec('sec_a3', 'A3 — Family Requirement Matrix', [
          rating('Lifestyle Mapping — Key Behaviours', [
            'Frequency of entertaining at home (1=Rarely, 5=Very Frequent)',
            'Importance of outdoor / garden space',
            'Work from home frequency',
            'Importance of home gym / wellness facilities',
            'Technology / Smart Home interest level',
            'Importance of natural light in spaces',
            'Cooking frequency and intensity',
            'Importance of dedicated study / reading space',
            'Need for home office / professional setup',
            'Importance of dedicated children\'s play area',
          ]),
          cbg('Design Decision Authority', ['Primary Client — All Decisions','Joint Decision — Both Partners','Spouse — Interiors','Client — Architecture','Parents — Final Approval Required','Delegated to Designer'], 3),
          notes('Conflict or Differing Preferences Noted'),
        ]),
        sec('sec_a4', 'A4 — Pain Point Discovery', [
          cbg('Pain Points in Current / Previous Space', [
            'Lack of Storage — General','Lack of Wardrobe Space','Lack of Kitchen Storage','No Pantry / Utility Space',
            'Poor Natural Light','Poor Cross Ventilation','Noise from Road / Neighbours','Privacy Issues — Overlooked Spaces',
            'Small / Cramped Kitchen','No Dedicated Dining Space','No Home Office / Study','No Guest Room',
            'Parking Insufficient','Water Seepage / Dampness','Difficult Maintenance','Poor Space Planning',
            'No Outdoor Space / Balcony','No Children\'s Play Area','Security Concerns','Power Backup Issues',
            'Poor Aesthetics / Old Style','No Smart Home Features','Poor Plumbing / Water Pressure','No Dedicated Utility / Laundry',
          ], 4),
          matrix('Priority Pain Points — Rank Top 5', ['1st Priority Pain Point','2nd Priority Pain Point','3rd Priority Pain Point','4th Priority Pain Point','5th Priority Pain Point']),
          notes(),
        ]),
        sec('sec_a5', 'A5 — Design Aspiration & Mood', [
          cbg('Design Style Preference (select up to 3)', ['Modern / Contemporary','Luxury / High-End','Minimalist / Clean','Traditional / Classical','Neo-Classical','Scandinavian','Industrial','Japandi','Farmhouse / Rustic','Mid-Century Modern','Art Deco','Coastal / Resort','Bohemian','Eclectic / Mixed Style','Heritage / Vernacular','Futuristic / Avant-Garde'], 4),
          cbg('Desired Mood & Feel (select up to 3)', ['Calm & Serene','Warm & Cosy','Luxurious & Grand','Resort / Holiday Feel','5-Star Hotel Feel','Nature Inspired','Corporate / Professional','Vibrant & Energetic','Formal & Sophisticated','Minimal & Zen','Eclectic & Personal','Homely & Comfortable'], 4),
          cbg('Colour Philosophy', ['Warm Tones — Beige, Cream, Terracotta','Cool Tones — White, Grey, Blue','Earthy — Brown, Olive, Stone','Bold / Accent Colours Welcome','Monochromatic Palette','Jewel Tones — Emerald, Navy, Burgundy','Pastels / Soft Hues','No Strong Colours — Neutral Only'], 3),
          cbg('Quality & Finish Level', ['Value For Money','Standard','Premium','Luxury','Ultra Luxury'], 5),
          cbg('Project Driver — Deadline Linked To', ['Housewarming / Griha Pravesh','Wedding / Marriage in Family','Child Birth / New Baby','Festival — Diwali / Navratri','Business Launch','Tenant / Rental Handover','No Fixed Deadline','Other'], 4),
          tf('Desired Completion Date'), tf('Absolute Latest Deadline'),
          cbg('Sustainability Priorities', ['Solar Panels / Rooftop Solar Ready','Net Zero / Energy Efficient Design','Rainwater Harvesting','Water-Efficient Fixtures','Low VOC / Eco-Friendly Materials','Smart Energy Monitoring System','Green Building Certification (IGBC)','Natural Ventilation Design Priority','Waste Segregation / Composting','EV Charging Point','No Sustainability Requirements'], 4),
          notes(),
        ]),
      ],
    },
    {
      id: 'mod_b', label: 'Module B', title: 'Architecture Discovery',
      subtitle: 'Site Analysis · Vastu · Parking · Security · Utilities · Landscape · Lifestyle Modules',
      enabled: true, collapsed: false,
      sections: [
        sec('sec_b1', 'B1 — Site Constraints & Zoning', [
          cbg('Plot Characteristics', ['Regular Rectangular Plot','Corner Plot — Dual Road Frontage','Narrow Plot — Width < 20 ft','Irregular Shape','Sloped / Undulating Site','Waterlogged / Flood Risk','Adjacent to Existing Structure','Shared Boundary Wall','Existing Trees to Retain','Old Structure Exists on Plot'], 3),
          cbg('Regulatory / Society Constraints', ['Society / RWA Restrictions Apply','Ground Floor Cannot Be Modified','Height Restriction — Society','FAR / Coverage Restriction — Municipal','Setback Regulations Apply','Fire NOC Required','No External Façade Changes Allowed','Heritage / Conservation Zone','Commercial Restrictions in Residential Zone','No Basement Allowed'], 3),
          cbg('Access Constraints', ['Single Entry / Exit Point','Access Road Width < 10 ft','Material Delivery Access Restricted','Crane / Heavy Equipment Access Limited','Shared Driveway','No Weekend Construction Allowed','No Night Work Allowed'], 3),
          notes('Site Survey Observations'),
        ]),
        sec('sec_b2', 'B2 — Vastu Requirements', [
          cbg('Vastu Compliance Level', ['Strict Vastu — All Rooms Must Comply','Balanced Vastu — Prioritise Key Rooms','General Awareness Only — Best Effort','Vastu Consultant Will Be Engaged Separately','Vastu Not Required'], 3),
          tf('Vastu Consultant Name (if known)'), tf('Vastu Consultant Contact'),
          notes(),
        ]),
        sec('sec_b3', 'B3 — Parking & Vehicle Planning', [
          cbg('Parking Facilities Required', ['Covered Parking — Basement','Covered Parking — Ground Floor','Open Parking / Porch','Stilt Parking','Automated Car Parking System','Car Wash Area with Water Point','Car Lift (If Multi-Level)','Driver\'s Waiting Area','Bicycle Parking','2-Wheeler Parking Covered'], 3),
          notes(),
        ]),
        sec('sec_b4', 'B4 — Security System Planning', [
          matrix('Security Requirements', ['CCTV — Internal Coverage','CCTV — External / Perimeter','Video Door Phone (VDP)','Smart Door Lock — Front Door','Smart Door Lock — All Doors','Biometric Access Control','Motion Sensor Lighting','Burglar Alarm / Intruder Alert','Guard Room / Security Cabin','Perimeter Fencing / Boundary Wall','Electric Fence / Sensor Fence','Panic Button / Emergency Alert','Intercom System','Visitor Management System']),
          cbg('CCTV Coverage Preference', ['All Entry / Exit Points','Parking Area','Staircase / Lift Lobby','Common Areas','Perimeter / Boundary','Service Areas','All Outdoor Areas','Cloud Backup Required'], 4),
          notes(),
        ]),
        sec('sec_b5', 'B5 — Utility & Services Planning', [
          cbg('Water Supply', ['Municipal Connection','Borewell — New','Borewell — Existing','Tanker Connection (Backup)','Water Softener Required','Water Purifier (Central)','Rainwater Harvesting Required'], 3),
          cbg('Power Supply & Backup', ['Standard DISCOM Connection','Solar Panels — Grid Tied','Solar Panels — Off Grid / Hybrid','Inverter / UPS Backup','Generator (DG) Backup','Full Home DG Backup','Partial DG Backup — Essential Loads','Smart Energy Meter / Monitoring','EV Charging Point','Battery Storage System'], 3),
          cbg('Waste Management', ['Municipal Sewage Connection','Septic Tank — New','STP (Sewage Treatment Plant)','Grey Water Recycling','Organic Waste Composting','Biogas Unit','Waste Segregation Bins (Built-In)'], 3),
          notes(),
        ]),
        sec('sec_b6', 'B6 — Landscape & Outdoor Planning', [
          matrix('Landscape Requirements', ['Lawn / Green Lawn Area','Kitchen / Herb Garden','Ornamental Garden / Planters','Driveway Landscaping','Boundary Planting / Hedging','Gazebo / Pergola','Outdoor Seating / Lounge Area','BBQ / Outdoor Kitchen','Water Body / Fountain / Pond','Swimming Pool','Meditation / Yoga Area','Kids Play Area','Outdoor Gym Equipment','Pet Zone / Dog Run','Outdoor Lighting — Accent','Automated Irrigation System','Storage Shed / Garden Tool Store']),
          notes(),
        ]),
        sec('sec_b7', 'B7 — Luxury Lifestyle Modules', [
          matrix('Luxury Lifestyle Requirements', ['Home Theatre / Screening Room','Bar Lounge / Wet Bar','Wine Cellar / Wine Rack','Walk-In Wardrobe (Separate Room)','Dressing Room / Vanity Room','Private Spa / Jacuzzi','Sauna','Steam Room','Indoor Gym / Fitness Studio','Yoga / Meditation Room','Infinity Pool / Lap Pool','Indoor Pool','Art Gallery / Display Wall','Library / Reading Room','Trophy / Award Display Room','Prayer Hall / Large Pooja Room','Music Room / Recording Studio','Luxury Garage / Car Display']),
          cbg('Smart Home Level', ['Basic — App-Controlled Lights + AC + Security','Standard — Voice + App Full Room Control','Advanced — Zone Automation Scenes + Schedules','Full Smart Home — Central Controller AI + Integration'], 2),
          notes(),
        ]),
      ],
    },
    {
      id: 'mod_c', label: 'Module C', title: 'Interior Design Discovery',
      subtitle: 'Room-by-Room Requirements · Materials · Finishes · Furniture · Technology',
      enabled: true, collapsed: false,
      sections: [
        sec('sec_c1', 'C1 — Master Bedroom', [
          cbg('Bed Configuration', ['King Bed (6x6.5)','Queen Bed (5x6.5)','Twin Beds','Bed with Storage Below','Headboard Wall Required'], 3),
          cbg('Storage Planning', ['Walk-In Wardrobe (Separate)','Built-In Wardrobe — 2 Door','Built-In Wardrobe — 3 Door','Built-In Wardrobe — 4+ Door','Separate His & Hers Storage','Jewellery Drawer / Safe Provision','Shoe Cabinet — Medium','Shoe Cabinet — Large (50+ Pairs)','Handbag Display','Luggage Storage','Locker / Safe Required'], 3),
          cbg('Bedroom Features', ['Study Table / Desk','Dressing Table','Seating — Lounge Chair','Seating — Chaise','Reading Corner','Balcony Access','TV in Bedroom','TV Concealed / Hidden TV','Reading Lights on Both Sides','Ceiling Fan Required','Air Purifier Provision'], 3),
          cbg('Technology', ['Smart Lighting — Scene Control','Smart AC / Thermostat','Smart Curtains / Blinds','USB / Wireless Charging Points','Entertainment System','Sleep Tracking Integration','Emergency Alert / Panic Button'], 3),
          notes(),
        ], true),
        sec('sec_c2', 'C2 — Parents / In-Laws Bedroom', [
          cbg('Bed & Seating', ['Single Bed Provision','Bed with Attached Storage','Recliner Chair','TV Unit','Balcony Access'], 3),
          cbg('Accessibility Features', ['Attached Bathroom','Medical Equipment Space','Easy Access to Bathroom at Night','Senior-Friendly Grab Bars in Bathroom'], 3),
          notes(),
        ], true),
        sec('sec_c3', "C3 — Child's Bedroom", [
          cbg('Age Group', ['Toddler (0–5 yrs)','Child (6–12 yrs)','Teen (13–18 yrs)','Young Adult'], 4),
          cbg('Furniture & Storage', ['Study Desk — Full Size','Study Desk — Compact','Wardrobe — Standard','Wardrobe — Large','Bookshelf','Display for Trophies / Art','Toy Storage','Gaming Setup','Balcony Access','Loft Bed','Bunk Bed — Shared'], 3),
          notes(),
        ], true),
        sec('sec_c4', 'C4 — Living Room', [
          cbg('TV & Entertainment', ['TV — Large Format (55+ inch)','Built-In TV Unit','Floating TV Panel','No TV in Living Room','Bar Unit in Living Room','Fireplace (Decorative / Electric)'], 3),
          cbg('Seating & Furniture', ['Sofa — L-Shape','Sofa — Standard','Recliners','Coffee Table','Console Table','Bookshelf Display Wall','Artwork Display Wall'], 3),
          cbg('Design Features', ['Feature Wall / Accent Wall','Feature Ceiling Design','Statement Lighting'], 3),
          notes(),
        ]),
        sec('sec_c5', 'C5 — Dining Room', [
          cbg('Dining Table', ['6-Seater Dining Table','8-Seater Dining Table','10-Seater Dining Table','Extendable Dining Table'], 4),
          cbg('Additional Furniture', ['Bar Counter','Crockery Cabinet / Display','Buffet Console','Feature Pendant Lighting','Bay Window Seating','Breakfast Counter Separate'], 3),
          notes(),
        ]),
        sec('sec_c6', 'C6 — Kitchen', [
          cbg('Kitchen Layout', ['L-Shaped','U-Shaped','Straight / Single Wall','Parallel / Galley','Island Kitchen','Peninsula Counter'], 3),
          cbg('Cooking Profile', ['Pure Vegetarian Kitchen','Non-Vegetarian Kitchen','Separate Veg + Non-Veg Zones','Heavy Daily Cooking','Light Cooking / Minimal','Festival / Large Batch Cooking','Baking (Oven Essential)','Western Cooking Habits','Cook / Chef Employed'], 3),
          cbg('Additional Kitchen Spaces', ['Pantry Room / Pantry Cabinet','Breakfast Nook / Counter','Utility / Washing Area Adjacent','Servant / Helper Cooking Area','Wine / Drink Fridge','Separate Dry Store Room'], 3),
          matrix('Appliance Planning', ['Chimney / Hood','Hob — Gas','Hob — Induction','Built-In Microwave','Built-In Oven / OTG','Dishwasher','Wine / Beverage Cooler','Water Purifier (Built-In)','Tall Fridge (Double Door)','Side-by-Side Fridge','Instant Hot Water']),
          notes(),
        ]),
        sec('sec_c7', 'C7 — Master Bathroom', [
          matrix('Master Bathroom Features', ['Double Vanity (His & Hers)','Single Vanity','Large Format Mirror','LED Mirror / Smart Mirror','Shower + Bathtub Combination','Walk-In Shower Only','Freestanding Bathtub','Separate Water Closet Compartment','Bidet / Health Faucet','Smart Toilet / Auto Flush','Towel Warmer Rail','Heated Floor','Steam Room / Shower Steam','Floor-Mounted Toilet','Wall-Hung Toilet']),
          cbg('Sanitary Ware Brand Preference', ['Kohler','Grohe','TOTO','American Standard','Roca','Hindware','Cera','Parryware','Jaquar','HSIL / Queo','No Preference'], 4),
          notes(),
        ], true),
        sec('sec_c8', 'C8 — Pooja / Prayer Room', [
          cbg('Pooja Space Type', ['Dedicated Pooja Room — Full Room','Pooja Niche / Alcove Only','Pooja Corner — Living Room','No Pooja Room Required'], 4),
          cbg('Pooja Room Features', ['Idol / Murti Display','Photo Frame Display','Marble / Stone Mandir','Wooden Mandir','Flame / Diya Area','Storage Below Mandir','Seating — Floor Seating','Ventilation / Incense Exhaust','Special Lighting — Warm / Devotional','Sound System — Bhajan Speaker'], 3),
          notes(),
        ]),
      ],
    },
    {
      id: 'mod_d', label: 'Module D', title: 'Material Preference Library',
      subtitle: 'Flooring · Walls · Ceilings · Kitchen · Wardrobes · Sanitary · Lighting · Hardware',
      enabled: true, collapsed: false,
      sections: [
        sec('sec_d1', 'D1 — Flooring Preferences', [
          yn('Flooring Materials', ['Marble — Indian','Marble — Italian','Granite','Engineered Wood / Laminate','Hardwood / Solid Wood','Vitrified Tiles — Large Format','Vitrified Tiles — Standard','Ceramic Tiles','Porcelain Tiles','Micro Cement / Concrete Look','Terrazzo','Epoxy Flooring','Natural Stone — Sandstone / Kota','Luxury Vinyl Plank (LVP)']),
          notes(),
        ]),
        sec('sec_d2', 'D2 — Wall Treatment Preferences', [
          yn('Wall Finishes', ['Standard OBD Paint','Premium Emulsion (Asian / Nerolac)','Texture Paint','Wallpaper — Vinyl','Wallpaper — Fabric / Natural','Stone Cladding — Natural','Stone Cladding — Engineered','Wood Panelling / Wall Panelling','Micro Cement / Concrete Finish','Mirror Panel','PU / Lacquer Panel','3D Wall Panels','Brick / Exposed Brick Look','Venetian Plaster / Stucco']),
          notes(),
        ]),
        sec('sec_d3', 'D3 — Ceiling Preferences', [
          yn('Ceiling Types', ['False Ceiling — Gypsum (Plain)','False Ceiling — Coffered / Design','False Ceiling — POP Cornice','False Ceiling — MDF / Wood Look','Acoustic Ceiling Tiles','Exposed Concrete / Industrial','No False Ceiling — Direct Paint','Feature Ceiling — Living Room Only','Cove Lighting Integrated','Indirect / Hidden Lighting Profile']),
          notes(),
        ]),
        sec('sec_d4', 'D4 — Kitchen Material Preferences', [
          yn('Kitchen Materials', ['Shutter — Acrylic','Shutter — PU Lacquer','Shutter — Membrane / PVC','Shutter — Wood Grain (Laminate)','Shutter — Veneer','Counter — Granite','Counter — Quartz / Engineered Stone','Counter — Dekton / Sintered','Counter — Solid Surface (Corian)','Counter — Stainless Steel','Counter — Marble (Sealed)','Backsplash — Glass','Backsplash — Tiles','Backsplash — Stone / Quartz']),
          notes(),
        ]),
        sec('sec_d5', 'D5 — Lighting Preferences', [
          matrix('Lighting Requirements', ['Warm White (2700K-3000K) — Preferred Throughout','Cool White (5000K-6500K) — Task Areas','Tunable CCT — Smart Lighting','Recessed Downlights — Standard','Recessed Downlights — Anti-Glare','Surface Mounted — Decorative','Track Lighting — Art / Accent','Strip Lights — Cove / Under Cabinet','Pendant Lights — Dining Room','Statement Chandelier — Living Room','Wall Sconces — Bedroom Corridor','Sensor Lights — Bathrooms / Store','Landscape / Outdoor Lighting','Facade Uplighting']),
          cbg('Lighting Brand Preference', ['Philips / Signify','Wipro Lighting','Havells','Osram / Ledvance','Crompton','Orient Electric','Legrand','Lutron','No Preference'], 3),
          notes(),
        ]),
        sec('sec_d6', 'D6 — Material Sensitivity', [
          rating('Rate Importance of Each Factor (1=Low, 5=Critical)', ['Visual Appearance / Aesthetics','Durability / Longevity','Ease of Maintenance / Cleaning','Premium Feel / Touch','Brand Value / Recognition','Sustainability / Eco Credentials','Cost Efficiency / Value for Money','Locally Sourced / Indian Origin','Warranty / After Sales Support','Speed of Installation']),
          tf('Brands Specifically Preferred'), tf('Brands to Avoid'),
          notes(),
        ]),
      ],
    },
    {
      id: 'mod_e', label: 'Module E', title: 'Commercial Project Discovery',
      subtitle: 'Office · Retail · Hospitality · Healthcare · Institutional',
      enabled: true, collapsed: false,
      sections: [
        sec('sec_e1', 'E1 — Commercial Project Type', [
          cbg('Facility Type (select one)', ['Corporate Office — HQ','Corporate Office — Branch','Co-Working Space','Retail Showroom','Retail Shop / Boutique','Restaurant / Fine Dining','Casual Dining / Cafe','Hotel — Boutique','Hotel — Business','Serviced Apartments','Clinic / Polyclinic','Hospital / Medical Centre','School / Educational Institute','Factory Showroom','Warehouse with Office'], 3),
          tf('Total Area (sqft)'), tf('Number of Floors'), tf('Expected Daily Footfall'),
          notes(),
        ]),
        sec('sec_e2', 'E2 — Operational Requirements', [
          tf('Number of Employees'), tf('Number of Workstations'),
          tf('Number of Cabins'), tf('Meeting Rooms Required'),
          tf('Visitors per Day'), tf('Parking Spaces Required'),
          cbg('Brand Guidelines', ['Brand Guidelines Document Available','CI Manual Available','Corporate Colours Must Be Applied','Logo Signage Required','Wayfinding / Signage System Required','Open to Design Direction'], 3),
          matrix('Customer Journey Mapping', ['Entry / Arrival Experience','Reception / Welcome Area','Product Display / Merchandise Zone','Service / Counter Area','Waiting / Lounge Area','Transaction / Payment Area','Exit / Departure Experience','Staff Movement Zone (Back of House)','Storage / Stock Area','Loading / Delivery Access']),
          notes(),
        ]),
      ],
    },
    {
      id: 'mod_f', label: 'Module F', title: 'Execution & Procurement Planning',
      subtitle: 'Procurement Model · Material Responsibility · Existing Assets · Risk Discovery',
      enabled: true, collapsed: false,
      sections: [
        sec('sec_f1', 'F1 — Procurement Model', [
          cbg('Overall Procurement Model', ['Full Grihscape Procurement — Turnkey','Full Client Procurement — Site Management Only','Hybrid — Major Items Grihscape / Décor Client','Client Procures All — Grihscape Design + Supervision Only','To Be Decided per Category'], 2),
          notes(),
        ]),
        sec('sec_f2', 'F2 — Room Priority Ranking', [
          {
            id: `rp_${Math.random().toString(36).slice(2)}`, type: 'room_priority', label: 'Room Priority Ranking',
            rooms: ['Master Bedroom','Living Room','Kitchen','Master Bathroom','Dining Room','Parents Bedroom',"Children's Bedroom",'Guest Bedroom','Home Office / Study','Family Lounge','Pooja Room','Utility Room','Master Walk-In Wardrobe','Home Theatre','Gym / Wellness Area','Terrace / Outdoor','Parking / Garage','Staff / Service Area'].map(r => ({ id: `rpr_${Math.random().toString(36).slice(2)}`, room: r, priority: '', budget: '', phase: '', notes: '' })),
          },
          notes(),
        ]),
        sec('sec_f3', 'F3 — Risk Discovery', [
          cbg('Past Bad Experiences (select all that apply)', ['Architect — Design Not As Promised','Architect — Delayed Drawings','Interior Designer — Budget Overrun','Interior Designer — Quality Issues','Contractor — Missed Deadlines','Contractor — Sub-Standard Work','Contractor — Abandoned Project','PMC — Poor Supervision','Vendors — Delayed Supply','Labour — Safety Incidents','Previous Project — Cost Escalation'], 3),
          rating("Biggest Concerns About This Project (1=Low, 5=Critical)", ['Budget overrun / cost escalation','Delayed completion','Design not matching expectations','Quality of materials and workmanship','Site safety and cleanliness','Communication & responsiveness','Scope creep / change management','Disruption to current life / business']),
          notes("Designer's Risk Notes — Flagged Concerns"),
        ]),
      ],
    },
    {
      id: 'mod_g', label: 'Module G', title: 'Budget & Timeline Planning',
      subtitle: 'Overall Budget · Category Allocation · Phasing · Timeline Milestones',
      enabled: true, collapsed: false,
      sections: [
        sec('sec_g1', 'G1 — Overall Project Budget', [
          tf('Total Project Budget (Rs.)'), tf('Maximum Allowable Budget (Rs.)'),
          tf('Confirmed Funding Source'), tf('Loan / Financing Component (Rs.)'),
          cbg('Budget Attitude', ['Fixed Budget — No flexibility','Target Budget — +/- 10% tolerance','Guideline Budget — Flexible for right quality','Quality First — Budget secondary'], 2),
          notes(),
        ]),
        sec('sec_g2', 'G2 — Project Phasing', [
          cbg('Phasing Approach', ['Single Phase — Complete Project','Two Phases — Ground + Upper','Two Phases — Priority Rooms First','Multiple Phases — As Budget Permits','Phase 1 Must Include Living Areas','Phase 1 Must Include Master Suite','Phase 1 Must Include Kitchen','Phase 2 — Upper Floors / Secondary Areas'], 3),
          notes(),
        ]),
      ],
    },
    {
      id: 'mod_h', label: 'Module H', title: 'Requirement Freeze & Declarations',
      subtitle: 'Non-Negotiables · CDRF Freeze · Client Declaration · Designer Declaration · Revision Control',
      enabled: true, collapsed: false,
      sections: [
        sec('sec_h1', 'H1 — Non-Negotiable Requirements', [
          matrix('Non-Negotiable Requirements', ['Non-Negotiable #1','Non-Negotiable #2','Non-Negotiable #3','Non-Negotiable #4','Non-Negotiable #5','Non-Negotiable #6','Non-Negotiable #7','Non-Negotiable #8','Non-Negotiable #9','Non-Negotiable #10']),
          notes("Designer's Summary of Critical Requirements"),
        ]),
        sec('sec_h2', 'H2 — Requirement Freeze Certification', [
          cbg('Pre-Freeze Checklist', ['All sections have been reviewed with the client','Client confirms these requirements reflect their needs accurately','Designer confirms all requirements are technically feasible','No further major changes are expected after freeze','Client has been informed of Change Request implications'], 2),
          tf('Freeze Date'), tf('Project Code / Reference'),
          notes(),
        ]),
        sec('sec_h3', 'H3 — Declarations & Sign-Off', [
          tf('Client (Primary) — Name'), tf('Client (Primary) — Date'),
          tf('Spouse / Co-Client — Name'), tf('Spouse / Co-Client — Date'),
          tf('Lead Architect — Name'), tf('Lead Architect — Date'),
          tf('Design Principal — Name'), tf('Design Principal — Date'),
          notes('Post-Meeting Summary'),
        ]),
      ],
    },
  ];
}

// ─── Completion calculator (mirrors backend logic) ─────────────────
export function calcCDRFCompletion(modules: any[]): number {
  let total = 0, filled = 0;
  for (const mod of modules) {
    for (const sec of mod.sections ?? []) {
      for (const f of sec.fields ?? []) {
        if (f.type === 'text' || f.type === 'textarea') {
          total++; if ((f.value ?? '').trim()) filled++;
        } else if (f.type === 'checkbox_grid') {
          total++; if ((f.items ?? []).some((i: any) => i.checked)) filled++;
        } else if (f.type === 'requirement_matrix') {
          total++; if ((f.items ?? []).some((i: any) => i.must || i.nice || i.future)) filled++;
        } else if (f.type === 'rating_scale') {
          total++; if ((f.items ?? []).some((i: any) => i.value != null)) filled++;
        } else if (f.type === 'yes_no_table') {
          total++; if ((f.items ?? []).some((i: any) => i.value != null)) filled++;
        } else if (f.type === 'room_priority') {
          total++; if ((f.rooms ?? []).some((r: any) => r.priority?.trim())) filled++;
        }
      }
    }
  }
  return total ? Math.round((filled / total) * 100) : 0;
}

// ─── Small utility button ─────────────────────────────────────────
function Btn({ icon, title, onClick, small, color = C.grey600, disabled: dis }: any) {
  return (
    <button title={title} onClick={onClick} disabled={dis}
      style={{ background: 'none', border: `1px solid ${C.grey200}`, borderRadius: 6, padding: small ? '3px 7px' : '5px 10px', fontSize: small ? 13 : 14, color: dis ? C.grey300 : color, cursor: dis ? 'default' : 'pointer', lineHeight: 1, transition: 'all 0.15s', fontWeight: 600 }}
      onMouseEnter={(e: any) => { if (!dis) e.target.style.background = C.grey50; }}
      onMouseLeave={(e: any) => { if (!dis) e.target.style.background = 'none'; }}
    >{icon}</button>
  );
}

// ─── Field: Text ──────────────────────────────────────────────────
function TextField({ field, onChange, readOnly }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.grey600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{field.label}</label>
      <input
        value={field.value || ''}
        readOnly={readOnly}
        onChange={e => !readOnly && onChange({ ...field, value: e.target.value })}
        style={{ width: '100%', border: 'none', borderBottom: `2px solid ${C.grey200}`, padding: '8px 0', fontSize: 13, color: C.grey800, background: 'transparent', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', cursor: readOnly ? 'default' : 'text' }}
        onFocus={e => !readOnly && (e.target.style.borderBottomColor = C.orange)}
        onBlur={e => (e.target.style.borderBottomColor = C.grey200)}
        placeholder={field.placeholder || ''}
      />
    </div>
  );
}

// ─── Field: Textarea ──────────────────────────────────────────────
function TextAreaField({ field, onChange, readOnly }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.grey600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{field.label}</label>
      <textarea
        value={field.value || ''}
        readOnly={readOnly}
        onChange={e => !readOnly && onChange({ ...field, value: e.target.value })}
        rows={3}
        style={{ width: '100%', border: `1px solid ${C.grey200}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.grey800, background: C.grey50, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s', cursor: readOnly ? 'default' : 'text' }}
        onFocus={e => !readOnly && (e.target.style.borderColor = C.orange)}
        onBlur={e => (e.target.style.borderColor = C.grey200)}
      />
    </div>
  );
}

// ─── Field: Checkbox Grid ─────────────────────────────────────────
function CheckboxGridField({ field, onChange, readOnly }: any) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const cols = field.cols || 3;

  const toggle = (itemId: string) => {
    if (readOnly) return;
    onChange({ ...field, items: field.items.map((it: any) => it.id === itemId ? { ...it, checked: !it.checked } : it) });
  };

  const addItem = () => {
    if (!newLabel.trim() || readOnly) return;
    const newItem = { id: `cb_c_${Math.random().toString(36).slice(2)}`, label: newLabel.trim(), checked: false, custom: true };
    onChange({ ...field, items: [...field.items, newItem] });
    setNewLabel(''); setAdding(false);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.grey600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{field.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '6px 12px' }}>
        {(field.items ?? []).map((item: any) => (
          <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: readOnly ? 'default' : 'pointer', padding: '6px 8px', borderRadius: 6, background: item.checked ? C.orangeLight : 'transparent', border: `1px solid ${item.checked ? C.orange : C.grey100}`, transition: 'all 0.15s' }}>
            <input type="checkbox" checked={item.checked || false} onChange={() => toggle(item.id)} disabled={readOnly} style={{ marginTop: 2, accentColor: C.orange, flexShrink: 0, cursor: readOnly ? 'default' : 'pointer' }} />
            <span style={{ fontSize: 12, color: item.checked ? C.navy : C.grey800, lineHeight: 1.4 }}>
              {item.label}
              {item.custom && <span style={{ marginLeft: 6, fontSize: 9, background: C.orange, color: 'white', borderRadius: 3, padding: '1px 4px', fontWeight: 700 }}>CUSTOM</span>}
            </span>
          </label>
        ))}
      </div>
      {!readOnly && (
        adding ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAdding(false); }}
              placeholder="Enter new option…" style={{ flex: 1, border: `1px solid ${C.orange}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, outline: 'none' }} />
            <button onClick={addItem} style={{ background: C.orange, color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Add</button>
            <button onClick={() => setAdding(false)} style={{ background: C.grey100, color: C.grey600, border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ marginTop: 8, background: 'none', border: `1px dashed ${C.grey300}`, borderRadius: 6, padding: '5px 12px', fontSize: 11, color: C.grey500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add option
          </button>
        )
      )}
    </div>
  );
}

// ─── Field: Requirement Matrix ────────────────────────────────────
function RequirementMatrixField({ field, onChange, readOnly }: any) {
  const update = (id: string, col: string, val: boolean) => {
    if (readOnly) return;
    onChange({ ...field, items: field.items.map((it: any) => it.id === id ? { ...it, [col]: val } : it) });
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.grey600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{field.label}</div>
      <div style={{ border: `1px solid ${C.grey200}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 120px', background: C.grey100, borderBottom: `1px solid ${C.grey200}`, padding: '8px 12px' }}>
          {['Requirement', 'Must Have', 'Nice To Have', 'Future'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? C.grey800 : C.grey600, textTransform: 'uppercase', textAlign: i > 0 ? 'center' : 'left' }}>{h}</div>
          ))}
        </div>
        {(field.items ?? []).map((item: any, idx: number) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 120px', padding: '8px 12px', background: idx % 2 === 0 ? C.grey50 : 'white', borderTop: `1px solid ${C.grey100}`, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.grey800 }}>{item.label}</span>
            {['must', 'nice', 'future'].map(col => (
              <div key={col} style={{ display: 'flex', justifyContent: 'center' }}>
                <input type="checkbox" checked={item[col] || false} disabled={readOnly} onChange={e => update(item.id, col, e.target.checked)} style={{ accentColor: col === 'must' ? C.orange : col === 'nice' ? C.navyMid : C.grey400, width: 16, height: 16, cursor: readOnly ? 'default' : 'pointer' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field: Rating Scale ──────────────────────────────────────────
function RatingScaleField({ field, onChange, readOnly }: any) {
  const update = (id: string, val: number) => {
    if (readOnly) return;
    onChange({ ...field, items: field.items.map((it: any) => it.id === id ? { ...it, value: it.value === val ? null : val } : it) });
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.grey600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{field.label}</div>
      <div style={{ border: `1px solid ${C.grey200}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 60px 60px', background: C.grey100, borderBottom: `1px solid ${C.grey200}`, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.grey800, textTransform: 'uppercase' }}>Item</div>
          {[1,2,3,4,5].map(n => <div key={n} style={{ fontSize: 10, fontWeight: 700, color: C.grey600, textAlign: 'center' }}>{n}</div>)}
        </div>
        {(field.items ?? []).map((item: any, idx: number) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 60px 60px', padding: '8px 12px', background: idx % 2 === 0 ? C.grey50 : 'white', borderTop: `1px solid ${C.grey100}`, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.grey800 }}>{item.label}</span>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => update(item.id, n)} disabled={readOnly}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${item.value === n ? C.orange : C.grey200}`, background: item.value === n ? C.orange : 'white', color: item.value === n ? 'white' : C.grey400, fontSize: 11, fontWeight: 700, cursor: readOnly ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >{n}</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field: Yes/No Table ──────────────────────────────────────────
function YesNoTableField({ field, onChange, readOnly }: any) {
  const update = (id: string, val: string) => {
    if (readOnly) return;
    onChange({ ...field, items: field.items.map((it: any) => it.id === id ? { ...it, value: it.value === val ? null : val } : it) });
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.grey600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{field.label}</div>
      <div style={{ border: `1px solid ${C.grey200}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', background: C.grey100, borderBottom: `1px solid ${C.grey200}`, padding: '8px 12px' }}>
          {['Item', 'Preferred', 'Avoid'].map((h, i) => <div key={i} style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? C.grey800 : C.grey600, textTransform: 'uppercase', textAlign: i > 0 ? 'center' : 'left' }}>{h}</div>)}
        </div>
        {(field.items ?? []).map((item: any, idx: number) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', padding: '8px 12px', background: idx % 2 === 0 ? C.grey50 : 'white', borderTop: `1px solid ${C.grey100}`, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.grey800 }}>{item.label}</span>
            {['yes', 'no'].map(v => (
              <div key={v} style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => update(item.id, v)} disabled={readOnly}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${item.value === v ? (v === 'yes' ? C.green : C.red) : C.grey200}`, background: item.value === v ? (v === 'yes' ? C.green : C.red) : 'white', cursor: readOnly ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <span style={{ fontSize: 13, color: item.value === v ? 'white' : C.grey400 }}>{v === 'yes' ? '✓' : '✕'}</span>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field: Room Priority ─────────────────────────────────────────
function RoomPriorityField({ field, onChange, readOnly }: any) {
  const update = (id: string, key: string, val: string) => {
    if (readOnly) return;
    onChange({ ...field, rooms: field.rooms.map((r: any) => r.id === id ? { ...r, [key]: val } : r) });
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.grey600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{field.label}</div>
      <div style={{ border: `1px solid ${C.grey200}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 1fr', background: C.grey100, borderBottom: `1px solid ${C.grey200}`, padding: '8px 12px' }}>
          {['Room / Space', 'Priority', 'Budget %', 'Phase', 'Notes'].map((h, i) => <div key={i} style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? C.grey800 : C.grey600, textTransform: 'uppercase', textAlign: i > 0 ? 'center' : 'left' }}>{h}</div>)}
        </div>
        {(field.rooms ?? []).map((room: any, idx: number) => (
          <div key={room.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 1fr', padding: '6px 12px', background: idx % 2 === 0 ? C.grey50 : 'white', borderTop: `1px solid ${C.grey100}`, alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: C.grey800 }}>{room.room}</span>
            {['priority', 'budget', 'phase'].map(key => (
              <input key={key} value={room[key] || ''} readOnly={readOnly} onChange={e => update(room.id, key, e.target.value)}
                style={{ border: `1px solid ${C.grey200}`, borderRadius: 4, padding: '4px 6px', fontSize: 11, textAlign: 'center', width: '100%', boxSizing: 'border-box', outline: 'none', background: readOnly ? C.grey50 : 'white' }}
                onFocus={e => !readOnly && (e.target.style.borderColor = C.orange)}
                onBlur={e => (e.target.style.borderColor = C.grey200)} />
            ))}
            <input value={room.notes || ''} readOnly={readOnly} onChange={e => update(room.id, 'notes', e.target.value)} placeholder="Notes…"
              style={{ border: `1px solid ${C.grey200}`, borderRadius: 4, padding: '4px 6px', fontSize: 11, width: '100%', boxSizing: 'border-box', outline: 'none', background: readOnly ? C.grey50 : 'white' }}
              onFocus={e => !readOnly && (e.target.style.borderColor = C.orange)}
              onBlur={e => (e.target.style.borderColor = C.grey200)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field renderer ───────────────────────────────────────────────
function FieldRenderer({ field, onChange, readOnly }: any) {
  const props = { field, onChange, readOnly };
  if (field.type === 'text')                return <TextField {...props} />;
  if (field.type === 'textarea')            return <TextAreaField {...props} />;
  if (field.type === 'checkbox_grid')       return <CheckboxGridField {...props} />;
  if (field.type === 'requirement_matrix')  return <RequirementMatrixField {...props} />;
  if (field.type === 'rating_scale')        return <RatingScaleField {...props} />;
  if (field.type === 'yes_no_table')        return <YesNoTableField {...props} />;
  if (field.type === 'room_priority')       return <RoomPriorityField {...props} />;
  return null;
}

// ─── Section panel ────────────────────────────────────────────────
const DUPLICABLE_LIMIT = 8;

function SectionPanel({ section, modEnabled, onFieldChange, onDuplicate, onToggleEnabled, onMoveUp, onMoveDown, canMoveUp, canMoveDown, duplicateCount, onAddCustomField, readOnly }: any) {
  const [collapsed, setCollapsed] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('textarea');

  const addField = () => {
    if (!newFieldLabel.trim() || readOnly) return;
    let newField: any;
    if (newFieldType === 'textarea') newField = { id: `ta_c_${Math.random().toString(36).slice(2)}`, type: 'textarea', label: newFieldLabel.trim(), value: '', custom: true };
    else if (newFieldType === 'text') newField = { id: `tf_c_${Math.random().toString(36).slice(2)}`, type: 'text', label: newFieldLabel.trim(), value: '', placeholder: '', custom: true };
    else if (newFieldType === 'checkbox_grid') newField = { id: `cbg_c_${Math.random().toString(36).slice(2)}`, type: 'checkbox_grid', label: newFieldLabel.trim(), cols: 3, items: [], custom: true };
    if (newField) onAddCustomField(newField);
    setNewFieldLabel(''); setAddingField(false);
  };

  const disabled = !section.enabled || !modEnabled;
  const isCustomDuplicate = section.duplicatedFrom !== null;

  return (
    <div id={section.id} style={{ marginBottom: 16, border: `1px solid ${disabled ? C.grey200 : C.grey100}`, borderRadius: 10, overflow: 'hidden', opacity: disabled ? 0.6 : 1, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: disabled ? C.grey100 : C.grey50, borderBottom: collapsed ? 'none' : `1px solid ${C.grey100}` }}>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: disabled ? C.grey400 : C.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
          {section.label}
          {section.instanceIndex > 1 && <span style={{ fontSize: 10, background: C.navyMid, color: 'white', borderRadius: 4, padding: '2px 6px' }}>Copy {section.instanceIndex}</span>}
          {isCustomDuplicate && <span style={{ fontSize: 10, background: C.orange, color: 'white', borderRadius: 4, padding: '2px 6px' }}>DUP</span>}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {!readOnly && canMoveUp && <Btn icon="↑" title="Move Up" onClick={onMoveUp} small />}
          {!readOnly && canMoveDown && <Btn icon="↓" title="Move Down" onClick={onMoveDown} small />}
          {!readOnly && section.duplicable && duplicateCount < DUPLICABLE_LIMIT && (
            <Btn icon="⧉" title={`Duplicate (${duplicateCount}/${DUPLICABLE_LIMIT})`} onClick={onDuplicate} small color={C.navyMid} />
          )}
          {!readOnly && (
            <Btn icon={section.enabled ? '⊘' : '↺'} title={section.enabled ? 'Disable section' : 'Re-enable section'} onClick={onToggleEnabled} small color={section.enabled ? C.amber : C.green} />
          )}
          <Btn icon={collapsed ? '▶' : '▼'} title="Collapse" onClick={() => setCollapsed(c => !c)} small />
        </div>
      </div>

      {disabled && !collapsed && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-15deg)', fontSize: 22, fontWeight: 900, color: C.grey300, letterSpacing: '0.2em', pointerEvents: 'none', zIndex: 2, border: `3px solid ${C.grey300}`, padding: '4px 14px', borderRadius: 8 }}>NOT APPLICABLE</div>
      )}

      {!collapsed && (
        <div style={{ padding: '16px 18px', pointerEvents: disabled ? 'none' : 'auto' }}>
          {(section.fields ?? []).map((field: any) => (
            <FieldRenderer key={field.id} field={field} onChange={(u: any) => onFieldChange(field.id, u)} readOnly={readOnly || disabled} />
          ))}
          {!readOnly && !disabled && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.grey200}` }}>
              {addingField ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={newFieldType} onChange={e => setNewFieldType(e.target.value)} style={{ border: `1px solid ${C.orange}`, borderRadius: 6, padding: '6px 8px', fontSize: 12, outline: 'none' }}>
                    <option value="textarea">Notes Block</option>
                    <option value="text">Text Field</option>
                    <option value="checkbox_grid">Checkbox Group</option>
                  </select>
                  <input autoFocus value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addField(); if (e.key === 'Escape') setAddingField(false); }}
                    placeholder="Field label…" style={{ flex: 1, minWidth: 160, border: `1px solid ${C.orange}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, outline: 'none' }} />
                  <button onClick={addField} style={{ background: C.orange, color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Add</button>
                  <button onClick={() => setAddingField(false)} style={{ background: C.grey100, border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', color: C.grey600 }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setAddingField(true)} style={{ background: 'none', border: `1px dashed ${C.grey300}`, borderRadius: 6, padding: '6px 14px', fontSize: 11, color: C.grey500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>+</span> Add custom field
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────
function Sidebar({ modules, activeSectionId, onSelectSection, pct }: any) {
  return (
    <div style={{ width: 220, minWidth: 220, background: C.navyDark, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', flexShrink: 0 }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: 'rgba(255,255,255,0.08) 1px solid' }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: 'white', letterSpacing: '0.06em' }}>CDRF</div>
        <div style={{ fontSize: 9, color: C.orange, fontWeight: 600, letterSpacing: '0.08em', marginTop: 2 }}>CLIENT DESIGN REQUIREMENT FORM</div>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: 'rgba(255,255,255,0.08) 1px solid' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? C.green : C.orange, borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: 11, color: C.orange, fontWeight: 700, minWidth: 32 }}>{pct}%</span>
        </div>
      </div>
      <div style={{ flex: 1, padding: '8px 0' }}>
        {modules.map((mod: any) => (
          <div key={mod.id}>
            <div style={{ padding: '8px 14px 4px', fontSize: 9, fontWeight: 800, color: mod.enabled ? C.orange : 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {mod.label} — {mod.title.split(' ').slice(0, 2).join(' ')}{!mod.enabled ? ' ⊘' : ''}
            </div>
            {!mod.collapsed && mod.sections.map((sec: any) => {
              const secDisabled = !sec.enabled || !mod.enabled;
              const isActive = activeSectionId === sec.id;
              return (
                <div key={sec.id} onClick={() => onSelectSection(sec.id)}
                  style={{ padding: '6px 14px 6px 22px', fontSize: 11, color: secDisabled ? 'rgba(255,255,255,0.2)' : isActive ? 'white' : 'rgba(255,255,255,0.55)', cursor: 'pointer', background: isActive ? 'rgba(184,144,71,0.15)' : 'transparent', borderLeft: isActive ? `3px solid ${C.orange}` : '3px solid transparent', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1.3 }}
                  onMouseEnter={(e: any) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e: any) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 8, color: isActive ? C.orange : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>●</span>
                  <span style={{ fontSize: 11 }}>{sec.label}</span>
                  {secDisabled && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>N/A</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main editor export ───────────────────────────────────────────
export function CDRFEditor({ initialModules, onChange, readOnly = false }: CDRFEditorProps) {
  const [data, setData] = useState<any[]>(() =>
    initialModules && initialModules.length > 0 ? initialModules : buildCDRFTemplate()
  );

  const [activeSec, setActiveSec] = useState('sec_a1');

  const updateData = useCallback((updater: (prev: any[]) => any[]) => {
    if (readOnly) return;
    setData(prev => {
      const next = updater(prev);
      onChange(next);
      return next;
    });
  }, [readOnly, onChange]);

  const handleFieldChange = (secId: string, fieldId: string, updated: any) => {
    updateData(prev => prev.map(mod => ({
      ...mod,
      sections: mod.sections.map((sec: any) => sec.id !== secId ? sec : {
        ...sec,
        fields: sec.fields.map((f: any) => f.id !== fieldId ? f : updated),
      })
    })));
  };

  const handleAddCustomField = (secId: string, newField: any) => {
    updateData(prev => prev.map(mod => ({
      ...mod,
      sections: mod.sections.map((sec: any) => sec.id !== secId ? sec : {
        ...sec,
        fields: [...sec.fields, newField],
      })
    })));
  };

  const handleDuplicate = (modId: string, secId: string) => {
    updateData(prev => prev.map(mod => {
      if (mod.id !== modId) return mod;
      const idx = mod.sections.findIndex((s: any) => s.id === secId);
      const orig = mod.sections[idx];
      const siblings = mod.sections.filter((s: any) => s.duplicatedFrom === secId || s.id === secId);
      if (siblings.length >= DUPLICABLE_LIMIT) return mod;
      const newSec = {
        ...JSON.parse(JSON.stringify(orig)),
        id: `${secId}_dup_${Date.now()}`,
        duplicatedFrom: secId,
        instanceIndex: siblings.length + 1,
        label: orig.label.replace(/ \d+$/, '') + ' ' + (siblings.length + 1),
        fields: JSON.parse(JSON.stringify(orig.fields)).map((f: any) => ({
          ...f,
          id: `${f.id}_d${Date.now()}`,
          ...(f.items ? { items: f.items.map((i: any) => ({ ...i, id: `${i.id}_d`, checked: false })) } : {}),
          ...(f.value !== undefined ? { value: '' } : {}),
          ...(f.rooms ? { rooms: f.rooms.map((r: any) => ({ ...r, priority: '', budget: '', phase: '', notes: '' })) } : {}),
        })),
      };
      const newSections = [...mod.sections];
      newSections.splice(idx + siblings.length, 0, newSec);
      return { ...mod, sections: newSections };
    }));
  };

  const handleToggleSection = (modId: string, secId: string) => {
    updateData(prev => prev.map(mod => mod.id !== modId ? mod : {
      ...mod,
      sections: mod.sections.map((sec: any) => sec.id !== secId ? sec : { ...sec, enabled: !sec.enabled })
    }));
  };

  const handleToggleModule = (modId: string) => {
    updateData(prev => prev.map(m => m.id !== modId ? m : { ...m, enabled: !m.enabled }));
  };

  const handleCollapseModule = (modId: string) => {
    updateData(prev => prev.map(m => m.id !== modId ? m : { ...m, collapsed: !m.collapsed }));
  };

  const handleMoveSection = (modId: string, secId: string, dir: number) => {
    updateData(prev => prev.map(mod => {
      if (mod.id !== modId) return mod;
      const secs = [...mod.sections];
      const idx = secs.findIndex((s: any) => s.id === secId);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= secs.length) return mod;
      [secs[idx], secs[newIdx]] = [secs[newIdx], secs[idx]];
      return { ...mod, sections: secs };
    }));
  };

  const getDuplicateCount = (modId: string, secId: string) => {
    const mod = data.find(m => m.id === modId);
    if (!mod) return 1;
    return mod.sections.filter((s: any) => s.id === secId || s.duplicatedFrom === secId).length;
  };

  const handleSelectSection = (secId: string) => {
    setActiveSec(secId);
    const el = document.getElementById(secId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pct = calcCDRFCompletion(data);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 500, border: `1px solid ${C.grey200}`, borderRadius: 10, overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif", background: 'var(--page-bg, #F0F2F5)' }}>
      <Sidebar modules={data} activeSectionId={activeSec} onSelectSection={handleSelectSection} pct={pct} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {data.map(mod => (
          <div key={mod.id} id={mod.id} style={{ marginBottom: 28 }}>
            {/* Module header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '12px 16px', background: mod.enabled ? C.grey50 : C.grey100, border: `1px solid ${C.grey200}`, borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
              {!mod.enabled && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', zIndex: 1 }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.2em', border: '2px solid rgba(255,255,255,0.5)', padding: '4px 14px', borderRadius: 8, transform: 'rotate(-4deg)' }}>NOT APPLICABLE</span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.navy, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{mod.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.grey800 }}>{mod.title}</div>
                <div style={{ fontSize: 11, color: C.grey600, marginTop: 2 }}>{mod.subtitle}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 2 }}>
                <button onClick={() => handleCollapseModule(mod.id)} style={{ background: C.white, border: `1px solid ${C.grey200}`, color: C.grey800, borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                  {mod.collapsed ? '▶ Expand' : '▼ Collapse'}
                </button>
                {!readOnly && (
                  <button onClick={() => handleToggleModule(mod.id)} style={{ background: mod.enabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(22, 163, 74, 0.1)', border: `1px solid ${mod.enabled ? '#ef4444' : C.green}`, color: mod.enabled ? '#ef4444' : C.green, borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    {mod.enabled ? '⊘ Disable' : '↺ Enable'}
                  </button>
                )}
              </div>
            </div>


            {/* Sections */}
            {!mod.collapsed && mod.sections.map((sec: any, si: number) => (
              <SectionPanel
                key={sec.id}
                section={sec}
                modEnabled={mod.enabled}
                readOnly={readOnly}
                onFieldChange={(fId: string, updated: any) => handleFieldChange(sec.id, fId, updated)}
                onDuplicate={() => handleDuplicate(mod.id, sec.id)}
                onToggleEnabled={() => handleToggleSection(mod.id, sec.id)}
                onMoveUp={() => handleMoveSection(mod.id, sec.id, -1)}
                onMoveDown={() => handleMoveSection(mod.id, sec.id, 1)}
                canMoveUp={si > 0}
                canMoveDown={si < mod.sections.length - 1}
                duplicateCount={getDuplicateCount(mod.id, sec.id)}
                onAddCustomField={(f: any) => handleAddCustomField(sec.id, f)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
