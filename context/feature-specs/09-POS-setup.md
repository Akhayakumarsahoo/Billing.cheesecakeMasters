Now lets make outlet only page for billing where the biller can see the bill screen and can bill from there.
It can only be accessed by the outlet role. When one login using outlet gmail.the system will know it is logged in as an outlet.

## Design-

There will be a left sidebar where there will be buttons to navigate between pages like, New Bill (it will will open the menu with items), Order History (it will show the list of all orders with details in cards, where each card will have order id, date, time, total amount, payment method, status), Sales summery (it will show the summery of sales for the day), Daily settlement(static button for now).

By default when one login to the POS it will open the New Bill page.

where he can see the all list of menu items category wise with prices. there will be a search bar to search for the menu items. and there will be a cart on the right side where he can add items. on that cart bottom the total amount with gst will be shown. by clicking on the total amount it will show the total base price plus gst amount.
bellow the total amount there will be option to choose the payment method. if it is part payment it will open a popup where he can enter the amount and choose the payment method.
bellow that there will be a button to save the order.
On the top of the right cart biller can enter customer detail.

This must be responsive for mobile, tablet and desktop.
for smaller device from desktop use drawer of shadcn UI to implement the cart.

Implement this part from frontend to backend every thing.
test it and it should pass the npm run build.
