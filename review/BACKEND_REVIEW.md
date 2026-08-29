# Errand Hubb Backend Review

এই document শুধু `errand-hubb-backend` নিয়ে তৈরি। Backend-কে feature/module অনুযায়ী ভাগ করা হয়েছে, যাতে একটি part ধরে বুঝে বা change করা যায়।

## 1. Backend এক নজরে

| বিষয় | বর্তমান implementation |
| --- | --- |
| Framework | NestJS 11 + TypeScript |
| API prefix | `/api/v1` |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT (`access_token` HTTP-only cookie বা Bearer token) |
| Upload storage | Server local disk: `media/` |
| Realtime | Socket.IO namespace: `/messages` |
| Payment | Stripe Checkout + webhook |
| Email | Nodemailer / SMTP |

একটি সাধারণ API request এই path অনুসরণ করে:

```text
Frontend request
  -> Controller (route)
  -> Guard (JWT / role / subscription permission)
  -> DTO validation
  -> Service (business rules)
  -> PrismaService
  -> PostgreSQL
  -> TransformInterceptor-এর standard JSON response
```

Base URL local environment-এ সাধারণত `http://localhost:<PORT>/api/v1`। `PORT` config থেকে আসে; code-এর default `3001`।

## 2. Backend-এর Part List

বর্তমানে backend-এ নিচের প্রধান functional part আছে:

1. App bootstrap, configuration, common utilities
2. Prisma/database layer
3. Authentication and security
4. User and profile management
5. Categories
6. Posts (main errand/job post flow)
7. Service requests (second, separate request flow)
8. Messaging and realtime chat
9. Notifications
10. ErrandR subscriptions
11. Ads subscriptions
12. Ads management
13. Stripe webhooks and payment history
14. Merchandise orders
15. Admin dashboard statistics
16. Email/mail service
17. Monitoring (Sentry)

Root module সব feature register করে: `src/app.module.ts`।

---

## Part 1 — App bootstrap, config, common utilities

**Folder:** `src/config`, `src/common`, `src/main.ts`, `src/app.module.ts`

### দায়িত্ব

- Nest application চালু করা
- সব route-এ `/api/v1` prefix বসানো
- CORS, cookie parser, request validation, error formatting configure করা
- `media/` static files serve করা
- global rate limit configure করা

### গুরুত্বপূর্ণ file

| File | কাজ |
| --- | --- |
| `src/main.ts` | App start, CORS, global validation/filter/interceptor, `/media` setup |
| `src/config/config.ts` | `.env` variables এক জায়গায় load করে |
| `src/app.module.ts` | সব Nest module import করে |
| `src/common/interceptors/transform.interceptor.ts` | success response format করে |
| `src/common/filters/http-exception.filter.ts` | error response format করে |
| `src/common/utils/multer-options.ts` | image/chat file upload rules |
| `src/common/guards/roles.guard.ts` | role permission validate করে |

### Response format

Success response সাধারণত:

```json
{ "success": true, "data": {} }
```

Error response সাধারণত `success`, `statusCode`, `message`, `errors`, `path`, `timestamp` দেয়।

---

## Part 2 — Prisma and database layer

**Folder:** `prisma/`, `src/prisma/`

### দায়িত্ব

- PostgreSQL connection
- Prisma client lifecycle
- Database schema এবং migrations
- Seed scripts (admin, categories ইত্যাদি)

### গুরুত্বপূর্ণ file

| File | কাজ |
| --- | --- |
| `prisma/schema.prisma` | সব model, relation, enum-এর source of truth |
| `src/prisma/prisma.service.ts` | NestJS-এর জন্য Prisma client service |
| `src/prisma/prisma.module.ts` | Prisma service export করে |
| `prisma/migrations/` | schema history |
| `prisma/seed-admin.js` | প্রথম admin create করার script |
| `prisma/seed-categories.ts` | category data seed করে |

### প্রধান database model

`User`, `Profile`, `Category`, `Post`, `ServiceRequest`, `Conversation`, `Message`, `Notification`, `Subscription`, `AdsSubscription`, `PaymentHistory`, `WebhookEvent`, `AdCategory`, `AdSubcategory`, `Ad`, `MerchandiseOrder`, `LoginActivity`, `SecurityLog`।

---

## Part 3 — Authentication and security

**Folder:** `src/auth/`

### দায়িত্ব

- Client এবং ErrandR registration
- Login / logout
- JWT issue এবং verify
- Email verification
- Forgot/reset/change password
- Two-factor authentication (TOTP + recovery code)
- Login activity এবং security log

### API

| Method | Route | কাজ |
| --- | --- | --- |
| POST | `/auth/register/client` | Client account create; optional profile image |
| POST | `/auth/register/errand` | ErrandR account create; profile image/gallery সহ |
| POST | `/auth/login` | credentials verify; `access_token` cookie set করে |
| POST | `/auth/verify-2fa-login` | 2FA code verify করে login complete করে |
| POST | `/auth/logout` | auth cookie clear করে |
| POST | `/auth/verify-email` | email verification token verify করে |
| POST | `/auth/resend-verification` | verification email আবার পাঠায় |
| POST | `/auth/forgot-password` | reset token/email পাঠায় |
| POST | `/auth/reset-password` | reset token দিয়ে password বদলায় |
| POST | `/auth/change-password` | logged-in user password বদলায় |
| GET | `/auth/login-activity` | recent login device/activity |
| GET | `/auth/security-logs` | security events |
| POST | `/auth/generate-2fa` | QR/2FA secret তৈরি করে |
| POST | `/auth/enable-2fa` | 2FA enable করে |
| POST | `/auth/disable-2fa` | 2FA disable করে |

### Key files

- `auth.controller.ts`: HTTP endpoint
- `auth.service.ts`: password hashing, token, 2FA, mail, logs
- `guards/jwt-auth.guard.ts`: cookie/Bearer থেকে JWT verify করে
- `guards/subscription.guard.ts`: ErrandR subscription required কি না দেখে
- `dto/`: input validation contract

### Role

- `client`: কাজ create/search/connect করে
- `errand`: কাজ দেখে, chat করে, paid subscription লাগে এমন feature use করে
- `admin`: management feature চালায়

---

## Part 4 — Users and profiles

**Folder:** `src/users/`

### দায়িত্ব

- current logged-in user read করা
- profile, avatar, gallery, location, service/category preference update করা
- account deletion verification flow
- admin user status management

### API

| Method | Route | কাজ |
| --- | --- | --- |
| GET | `/users/me` | নিজের full user/profile |
| PATCH | `/users/profile` | profile, image, gallery update |
| POST | `/users/request-delete-account` | delete confirmation token পাঠায় |
| POST | `/users/delete-account-permanently` | password + code দিয়ে account delete |
| GET | `/users/admin/all` | admin-এর জন্য সব user |
| PATCH | `/users/admin/:id/status` | admin user active/deactivated status change |
| GET | `/errand-profiles` | public ErrandR profile list (root app controller) |

`Profile` model user-এর bio, phone, city/state, rate, services, gallery, YouTube links এবং category preference রাখে।

---

## Part 5 — Categories

**Folder:** `src/categories/`

### দায়িত্ব

Jobs/posts এবং service request-এর category taxonomy maintain করা। Category-তে name, description, icon, icon type, color, active/inactive status থাকে।

### API

| Method | Route | Access |
| --- | --- | --- |
| POST | `/categories` | Admin |
| POST | `/categories/upload-icon` | Admin |
| GET | `/categories` | Admin |
| GET | `/categories/active` | Public |
| GET | `/categories/:id` | Admin |
| PATCH | `/categories/:id` | Admin |
| DELETE | `/categories/:id` | Admin |

---

## Part 6 — Posts: primary errand/job flow

**Folder:** `src/posts/`

এটি current main flow। Public `/post-errand` form এবং ErrandR `/dashboard/available-jobs` এই `Post` API ব্যবহার করে।

### দায়িত্ব

- Client job/errand post তৈরি, edit, delete
- location/category/budget/status/search/pagination filter
- available jobs দেখানো
- post তৈরি হলে active subscribed ErrandR-কে in-app notification দেওয়া
- admin post moderation/management

### API

| Method | Route | কাজ |
| --- | --- | --- |
| POST | `/posts` | post create |
| GET | `/posts` | public/filterable list |
| GET | `/posts/my-posts` | current user-এর post |
| GET | `/posts/:id` | একটি post |
| PATCH | `/posts/:id` | owner update |
| DELETE | `/posts/:id` | owner delete |
| GET | `/posts/admin/all` | admin list |
| PATCH | `/posts/admin/:id` | admin update |
| DELETE | `/posts/admin/:id` | admin delete |

### Post fields

`title`, `description`, `city`, `state`, `budget`, `dateNeeded`, `contactInfo`, `photoUrl`, `youtubeLink`, `categoryId`, `status`, `postState`, `assignedToId`, `serviceType`, `time`।

---

## Part 7 — Service requests: second request flow

**Folder:** `src/service-requests/`

`ServiceRequest` এবং `Post` একই রকম হলেও আলাদা model ও API। এই flow-তে richer lifecycle status আছে: `draft`, `active`, `in_discussion`, `assigned`, `completed`, `cancelled`, `expired`।

### দায়িত্ব

- Client request create/manage করে
- ErrandR subscribed হলে available request দেখে এবং client-কে contact করে
- request-specific conversation relation রাখা
- Admin request manage করে

### API

| Area | Routes |
| --- | --- |
| Client | `POST /service-requests`, `GET /my-requests`, `GET /my-requests/:id`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/status`, `GET /:id/conversations` |
| ErrandR | `GET /available`, `GET /available/:id`, `POST /:id/contact`, `GET /:id/check-contact` |
| Admin | `GET /admin/all`, `PATCH /admin/:id/status`, `DELETE /admin/:id` |

### বর্তমান অবস্থান

Backend flow complete, কিন্তু frontend-এ বর্তমানে প্রধানত admin service-request management page এটি ব্যবহার করে। নতুন feature বানালে আগে ঠিক করতে হবে: **Post-এ হবে, নাকি ServiceRequest-এ হবে?**

---

## Part 8 — Messages and realtime chat

**Folder:** `src/messages/`

### দায়িত্ব

- Client ও ErrandR-এর one-to-one conversation
- chat message, image/audio/video/document upload
- unread count, pin, unsend, delete-for-me
- Socket.IO দিয়ে instant delivery, typing, read receipt
- admin conversation/schedule monitoring

### REST API

| Method | Route | কাজ |
| --- | --- | --- |
| GET | `/messages/conversations` | নিজের conversation list |
| GET | `/messages/conversations/:id/messages` | conversation message list/read mark |
| POST | `/messages/conversations` | conversation শুরু |
| POST | `/messages/upload` | chat attachment upload |
| GET | `/messages/admin/conversations` | admin conversation list |
| GET | `/messages/admin/conversations/:id/messages` | admin messages view |
| GET | `/messages/admin/schedules` | calendar/scheduled chat data |

### Socket events

Namespace: `/messages`

- `join_conversation`, `leave_conversation`
- `send_message` → `new_message`
- `typing` → `user_typing`
- `mark_read` → `messages_read`
- `message_action` → `message_updated` / `message_deleted`
- `message_notification`

---

## Part 9 — Notifications

**Folder:** `src/notifications/`

### দায়িত্ব

- DB-তে in-app notification persist করা
- Socket.IO দিয়ে live notification পাঠানো
- unread count রাখা
- admin-দের notification broadcast করা

### API

| Method | Route | কাজ |
| --- | --- | --- |
| GET | `/notifications` | paginated notification list |
| GET | `/notifications/unread-count` | unread number |
| PATCH | `/notifications/:id/read` | read mark |
| PATCH | `/notifications/:id/unread` | unread mark |
| POST | `/notifications/mark-all-read` | সব read mark |

Post creation, new message, new registration এবং schedule creation থেকে notification তৈরি হয়।

---

## Part 10 — ErrandR subscriptions

**Folder:** `src/subscriptions/`

### দায়িত্ব

- ErrandR-এর monthly/yearly Stripe subscription
- Checkout URL তৈরি
- cancellation এবং Stripe billing portal
- admin subscription/payment history view

### API

| Method | Route | কাজ |
| --- | --- | --- |
| POST | `/subscriptions/create-checkout-session` | Stripe subscription checkout |
| GET | `/subscriptions/me` | নিজের subscription status |
| POST | `/subscriptions/cancel` | period-end cancellation |
| POST | `/subscriptions/customer-portal` | Stripe portal URL |
| GET | `/subscriptions/admin/all` | subscription list |
| GET | `/subscriptions/admin/all/:id` | one subscription detail |
| GET | `/subscriptions/admin/payments` | payment history |
| GET | `/subscriptions/admin/payments/:id` | one payment detail |

`SubscriptionGuard` শুধুমাত্র `errand` role-এর জন্য active/trialing subscription check করে; client-এর জন্য এটি pass করে।

---

## Part 11 — Ads subscriptions

**Folder:** `src/ads-subscriptions/`

এটি normal ErrandR plan থেকে আলাদা advertising plan। `AdsSubscription` table-এ Stripe customer/subscription status থাকে।

| Method | Route | কাজ |
| --- | --- | --- |
| POST | `/ads-subscriptions/create-checkout-session` | ads Stripe checkout |
| GET | `/ads-subscriptions/me` | নিজের ads subscription |
| POST | `/ads-subscriptions/cancel` | cancellation |
| POST | `/ads-subscriptions/customer-portal` | Stripe portal |

---

## Part 12 — Ads management

**Folder:** `src/ads/`

### দায়িত্ব

- business/promotion ad create/edit/delete
- image upload
- ad category/subcategory
- public search/filter/pagination
- admin ordering and admin-create

| Method | Route | কাজ |
| --- | --- | --- |
| POST | `/ads` | logged-in user ad create |
| POST | `/ads/admin` | admin ad create |
| POST | `/ads/upload` | image upload |
| GET | `/ads` | public ad list/filter |
| GET | `/ads/my-ads` | own ads |
| GET | `/ads/categories` | ad category/subcategory list |
| PATCH | `/ads/reorder` | admin position update |
| GET | `/ads/:id` | one ad |
| PATCH | `/ads/:id` | owner/admin update |
| DELETE | `/ads/:id` | owner/admin delete |

---

## Part 13 — Stripe webhooks and payment history

**Folder:** `src/webhooks/`

### দায়িত্ব

Stripe থেকে payment success/failure/subscription update receive করে server-side database update করে। Frontend success URL-কে payment truth ধরা হয় না।

### API

| Method | Route | কাজ |
| --- | --- | --- |
| POST | `/webhooks/stripe` | Stripe signed webhook receive/verify/process |

### Processed event

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Duplicate Stripe event আটকাতে `WebhookEvent` table ব্যবহার হয়। Invoice payment result `PaymentHistory` table-এ যায়।

---

## Part 14 — Merchandise orders

**Folder:** `src/merchandise-orders/`

### দায়িত্ব

- merchandise cart থেকে order record create
- Stripe one-time payment checkout
- webhook payment success হলে `isPaid = true`
- admin-side delivery status change

| Method | Route | কাজ |
| --- | --- | --- |
| POST | `/merchandise-orders` | order + Stripe checkout URL create |
| GET | `/merchandise-orders` | order list |
| PATCH | `/merchandise-orders/:id/status` | `pending/accepted/shipped/delivered/cancelled` update |

Order-এ buyer name/email/address, JSON items, amount, payment status এবং Stripe session ID থাকে।

---

## Part 15 — Admin dashboard

**Folder:** `src/dashboard/`

| Method | Route | Access | কাজ |
| --- | --- | --- | --- |
| GET | `/dashboard/admin/stats` | Admin | users, posts, subscription ইত্যাদির dashboard summary |

---

## Part 16 — Mail service

**Folder:** `src/mail/`

### দায়িত্ব

- registration verification email
- reset password email
- delete account confirmation email
- subscription started/cancelled/payment-success/payment-failed email
- public contact-form email

`MailService` অন্য feature service থেকে call হয়; এটি নিজে public controller endpoint দেয় না। SMTP config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`।

---

## Part 17 — Sentry monitoring

**File:** `src/instrument.ts`

Sentry DSN থাকলে application error/performance profiling Sentry-তে পাঠায়। `/debug-sentry` নামে একটি debug routeও আছে।

---

## 3. Important cross-module flow

### A. Client creates a post

```text
POST /posts
  -> JwtAuthGuard
  -> PostsService.create()
  -> Post + Category relation save
  -> active subscribed ErrandR খোঁজে
  -> Notification rows create করে
  -> Socket notification পাঠায় (যদি online হয়)
```

### B. Client and ErrandR chat

```text
POST /messages/conversations
  -> Conversation create/find

Socket send_message
  -> Message DB-তে save
  -> conversation room-এ new_message emit
  -> receiver notification DB-তে save
  -> receiver user room-এ notification emit
```

### C. Subscription payment

```text
POST /subscriptions/create-checkout-session
  -> Stripe Checkout URL
  -> User Stripe-তে payment করে
  -> POST /webhooks/stripe
  -> signature verify
  -> Subscription / PaymentHistory update
  -> SubscriptionGuard next protected request-এ access দেয়
```

---

## 4. গুরুত্বপূর্ণ সিদ্ধান্ত নেওয়ার নিয়ম

নতুন backend task শুরু করার আগে এই প্রশ্নগুলো ঠিক করতে হবে:

1. এটি কোন module-এর feature: `posts`, `service-requests`, `ads`, না `users`?
2. কোন role route-টি use করতে পারবে: client, errand, admin, নাকি public?
3. কোন new field database-এ লাগবে কি না?
4. এটি REST-only, নাকি realtime socket notification দরকার?
5. এটি payment/subscription-required feature কি না?
6. নতুন upload লাগলে কোন media folder এবং allowed file type লাগবে?

---

## 5. Review-এ ধরা গুরুত্বপূর্ণ follow-up item

এগুলো future fix/review-এর জন্য আলাদা করে রাখা হলো:

1. `Posts` এবং `ServiceRequest` একই ধরনের কাজের জন্য parallel flow; কোনটি product-এর canonical flow হবে নির্ধারণ দরকার।
2. Socket gateway JWT `decode` করে; token signature verify করা উচিত।
3. Subscription-এর `admin/*` route-এ JWT আছে, কিন্তু explicit admin RolesGuard নেই।
4. Merchandise order list/status route-এ auth/role protection যোগ করা দরকার।
5. CORS বর্তমানে unrestricted fallback দেয়; production allowlist দরকার।
6. Upload এবং JSON payload limit production-safe করা দরকার।
7. Local `media/` storage VPS restart/deployment-এর জন্য durable নয়; cloud storage better।
8. Email/webhook synchronous; scale হলে queue/Redis দরকার হবে।
9. Automated test coverage এখন খুব সীমিত।

## 6. দ্রুত navigation

```text
src/
├── auth/                   # identity, JWT, 2FA
├── users/                  # profile and user management
├── posts/                  # main job posts
├── service-requests/       # separate request lifecycle
├── messages/               # REST + Socket.IO chat
├── notifications/          # persistent/live alerts
├── subscriptions/          # ErrandR Stripe plan
├── ads-subscriptions/      # advertisement Stripe plan
├── ads/                    # ads CRUD
├── categories/             # job category CRUD
├── webhooks/               # Stripe events
├── merchandise-orders/     # merch checkout/order
├── dashboard/              # admin stats
├── mail/                   # SMTP delivery
├── prisma/                 # Prisma Nest integration
├── common/                 # shared guards/filter/interceptor/upload
├── config/                 # .env configuration
├── app.module.ts           # module registry
└── main.ts                 # app bootstrap
```
