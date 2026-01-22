# User Acceptance Testing (UAT) Template

## Test Session Information
- **Date**: _______________
- **Testers**: _______________
- **Environment**: Development / Production
- **Version**: _______________

## Test Scenarios

### Scenario 1: Customer Order Flow
**Tester**: _______________
**Date**: _______________

#### Steps:
1. [ ] Scan QR code or enter table number
2. [ ] Enter customer name
3. [ ] Browse menu and add items to cart
4. [ ] Place order
5. [ ] Track order status in real-time

#### Expected Results:
- [ ] Table is blocked immediately
- [ ] Menu loads from database
- [ ] Cart functions correctly
- [ ] Order is placed successfully
- [ ] Order status updates appear in real-time

#### Issues Found:
- Issue 1: _______________
- Issue 2: _______________

#### Status: ✅ Pass / ❌ Fail / ⚠️ Partial

---

### Scenario 2: Kitchen Display
**Tester**: _______________
**Date**: _______________

#### Steps:
1. [ ] Open kitchen display
2. [ ] Wait for new order
3. [ ] Update order status (new → preparing → ready)
4. [ ] Verify sound notification works

#### Expected Results:
- [ ] New orders appear instantly
- [ ] Status can be updated
- [ ] Updates reflect on customer screen
- [ ] Sound notification plays

#### Issues Found:
- Issue 1: _______________
- Issue 2: _______________

#### Status: ✅ Pass / ❌ Fail / ⚠️ Partial

---

### Scenario 3: Cashier Operations
**Tester**: _______________
**Date**: _______________

#### Steps:
1. [ ] Login as cashier
2. [ ] View all orders
3. [ ] Mark order as paid (cash/card)
4. [ ] Complete/close order
5. [ ] View order history

#### Expected Results:
- [ ] Sees all orders in real-time
- [ ] Can mark payment
- [ ] Can complete orders
- [ ] Order moves to history

#### Issues Found:
- Issue 1: _______________
- Issue 2: _______________

#### Status: ✅ Pass / ❌ Fail / ⚠️ Partial

---

### Scenario 4: Admin CRUD Operations
**Tester**: _______________
**Date**: _______________

#### Steps:
1. [ ] Login as admin
2. [ ] Create menu item
3. [ ] Update menu item
4. [ ] Delete menu item
5. [ ] Create category
6. [ ] Create table
7. [ ] Create cashier

#### Expected Results:
- [ ] All CRUD operations work
- [ ] Changes update live on customer/kitchen screens
- [ ] No errors occur

#### Issues Found:
- Issue 1: _______________
- Issue 2: _______________

#### Status: ✅ Pass / ❌ Fail / ⚠️ Partial

---

### Scenario 5: Real-time Updates (Multi-Device)
**Tester**: _______________
**Date**: _______________

#### Steps:
1. [ ] Open customer menu on Device 1
2. [ ] Open kitchen display on Device 2
3. [ ] Place order from Device 1
4. [ ] Verify order appears on Device 2
5. [ ] Update status on Device 2
6. [ ] Verify update on Device 1

#### Expected Results:
- [ ] Order appears instantly on kitchen display
- [ ] Status updates appear instantly on customer screen
- [ ] No page refresh needed

#### Issues Found:
- Issue 1: _______________
- Issue 2: _______________

#### Status: ✅ Pass / ❌ Fail / ⚠️ Partial

---

## Overall Feedback

### What Works Well:
1. _______________
2. _______________
3. _______________

### What Needs Improvement:
1. _______________
2. _______________
3. _______________

### Critical Issues:
1. _______________
2. _______________

### Suggestions:
1. _______________
2. _______________

## Test Summary

- **Total Scenarios**: 5
- **Passed**: _______
- **Failed**: _______
- **Partial**: _______

## Action Items

### High Priority:
- [ ] _______________
- [ ] _______________

### Medium Priority:
- [ ] _______________
- [ ] _______________

### Low Priority:
- [ ] _______________
- [ ] _______________

## Sign-off

- **Tester 1**: _______________ Date: _______
- **Tester 2**: _______________ Date: _______
- **Tester 3**: _______________ Date: _______

---

**Note**: This template should be filled out by at least 3-5 different users testing different roles (customer, cashier, kitchen, admin).
