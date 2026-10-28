/**
 * Navigation label shortener for mobile screens.
 * Preserves full descriptive labels on desktop while providing concise,
 * readable labels on small viewports without awkward wrapping.
 */
export const getShortNavLabel = (name: string): string => {
  const map: Record<string, string> = {
    'Fresh Vegetables': 'Veggies',
    'Fresh Fruits': 'Fruits',
    'Organic Rice & Millets': 'Rice & Millets',
    'Pulses & Lentils': 'Pulses',
    'Cold-Pressed Oils': 'Oils',
    'Dairy & Alternatives': 'Dairy',
    'Natural Sweeteners': 'Sweeteners',
    'Healthy Snacks': 'Snacks',
    'Spices & Herbs': 'Spices',
    'Organic Pantry Essentials': 'Pantry',
    'All Products': 'All',
    'Deals of the Day': 'Deals',
    'Categories': 'Shop',
    'Orders & Tracking': 'Orders',
    'My Orders': 'Orders',
    'My Account': 'Account',
    'Shopping Cart': 'Cart',
    'Saved Addresses': 'Addresses',
  };
  return map[name] || name;
};

