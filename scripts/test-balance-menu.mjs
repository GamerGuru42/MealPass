import { MealPassService } from '../src/lib/services/mealpass.service.js';

try {
  const menu = await MealPassService.getMenu();
  console.log('--- MENU RETRIEVAL RESULT ---');
  console.log('Count:', menu.length);
  if (menu.length > 0) {
    console.log('Sample:', menu[0].name, '₦' + menu[0].price, 'Category:', menu[0].categoryName);
  }
} catch (err) {
  console.error('Menu error:', err.message);
}
