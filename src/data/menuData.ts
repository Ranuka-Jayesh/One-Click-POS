import { MenuItem, Order, OrderStatus, Category } from "@/types/order";

export const categories: Category[] = [
  { id: "burgers", name: "Burgers", icon: "🍔" },
  { id: "pizza", name: "Pizza", icon: "🍕" },
  { id: "salads", name: "Salads", icon: "🥗" },
  { id: "drinks", name: "Drinks", icon: "🥤" },
  { id: "desserts", name: "Desserts", icon: "🍰" },
];

export const menuItems: MenuItem[] = [
  {
    id: "1",
    name: "Classic Smash Burger",
    description: "Double patty, American cheese, pickles, special sauce",
    price: 12.99,
    category: "burgers",
    image: "/placeholder.svg",
  },
  {
    id: "2",
    name: "Truffle Mushroom Burger",
    description: "Truffle aioli, sautéed mushrooms, swiss cheese",
    price: 15.99,
    category: "burgers",
    image: "/placeholder.svg",
  },
  {
    id: "3",
    name: "BBQ Bacon Burger",
    description: "Crispy bacon, onion rings, BBQ sauce, cheddar",
    price: 14.99,
    category: "burgers",
    image: "/placeholder.svg",
  },
  {
    id: "4",
    name: "Margherita Pizza",
    description: "Fresh mozzarella, basil, San Marzano tomatoes",
    price: 16.99,
    category: "pizza",
    image: "/placeholder.svg",
  },
  {
    id: "5",
    name: "Pepperoni Supreme",
    description: "Double pepperoni, extra cheese, oregano",
    price: 18.99,
    category: "pizza",
    image: "/placeholder.svg",
  },
  {
    id: "6",
    name: "Caesar Salad",
    description: "Romaine, parmesan, croutons, Caesar dressing",
    price: 10.99,
    category: "salads",
    image: "/placeholder.svg",
  },
  {
    id: "7",
    name: "Greek Salad",
    description: "Feta, olives, cucumber, tomatoes, red onion",
    price: 11.99,
    category: "salads",
    image: "/placeholder.svg",
  },
  {
    id: "8",
    name: "Fresh Lemonade",
    description: "House-made with real lemons and mint",
    price: 4.99,
    category: "drinks",
    image: "/placeholder.svg",
  },
  {
    id: "9",
    name: "Iced Coffee",
    description: "Cold brew with your choice of milk",
    price: 5.99,
    category: "drinks",
    image: "/placeholder.svg",
  },
  {
    id: "10",
    name: "Chocolate Brownie",
    description: "Warm fudge brownie with vanilla ice cream",
    price: 7.99,
    category: "desserts",
    image: "/placeholder.svg",
  },
  {
    id: "11",
    name: "New York Cheesecake",
    description: "Classic creamy cheesecake with berry compote",
    price: 8.99,
    category: "desserts",
    image: "/placeholder.svg",
  },
];

export const sampleOrders: Order[] = [
  {
    id: "ORD-001",
    customerName: "Table 5",
    items: [
      { menuItem: menuItems[0], quantity: 2 },
      { menuItem: menuItems[7], quantity: 2 },
    ],
    status: "new",
    total: 35.96,
    createdAt: new Date(Date.now() - 5 * 60000),
    isPaid: false,
  },
  {
    id: "ORD-002",
    customerName: "Alex M.",
    items: [
      { menuItem: menuItems[3], quantity: 1 },
      { menuItem: menuItems[5], quantity: 1 },
    ],
    status: "cooking",
    total: 27.98,
    createdAt: new Date(Date.now() - 12 * 60000),
    isPaid: true,
  },
  {
    id: "ORD-003",
    customerName: "Table 12",
    items: [
      { menuItem: menuItems[1], quantity: 1 },
      { menuItem: menuItems[9], quantity: 1 },
    ],
    status: "ready",
    total: 23.98,
    createdAt: new Date(Date.now() - 20 * 60000),
    isPaid: true,
  },
];
