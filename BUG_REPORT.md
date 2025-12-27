# Comprehensive System Bug Report
**Generated:** $(date)  
**Scope:** Functional reliability, usability, system stability, and consistent behavior  
**Exclusions:** Security testing (authentication, authorization, access control, penetration tests)

---

## Executive Summary

This report documents functional bugs, performance issues, and inconsistencies found across the Staff Management System. The analysis covered backend routes, frontend components, database queries, API integrations, and error handling patterns.

**Total Issues Found:** 23  
**Critical:** 2  
**High:** 8  
**Medium:** 10  
**Low:** 3

---

## Critical Issues

### 1. SQL Syntax Mismatch in Weekly Quota Check
**Location:** `backend/src/server.ts:177`  
**Severity:** Critical  
**Impact:** Weekly quota check cron job will fail, preventing automatic infraction issuance

**Issue:**
The `checkWeeklyQuotas()` function uses SQLite syntax `datetime(?, '-7 days')` but the database is MySQL. This will cause the query to fail.

```typescript
// Line 177 - INCORRECT (SQLite syntax)
const existing = await tx
  .prepare(
    `SELECT id FROM infractions 
     WHERE user_id = ? 
     AND reason LIKE ? 
     AND voided = 0 
     AND created_at > datetime(?, '-7 days')`
  )
```

**Expected Behavior:**
The query should use MySQL date functions.

**Reproduction Steps:**
1. Wait for Monday at 12:00 AM UTC
2. Check server logs for SQL syntax errors
3. Verify no infractions are issued for users below quota

**Fix:**
Replace `datetime(?, '-7 days')` with MySQL syntax:
```typescript
AND created_at > DATE_SUB(?, INTERVAL 7 DAY)
```

---

### 2. Missing NaN Validation for parseInt() Calls
**Location:** Multiple files (see details below)  
**Severity:** Critical  
**Impact:** Invalid route parameters could cause database errors or unexpected behavior

**Issue:**
Multiple endpoints use `parseInt(req.params.id)` without validating the result, which can lead to:
- NaN values being passed to database queries
- Unexpected query behavior
- Potential crashes

**Affected Files:**
- `backend/src/routes/management.ts:168, 214, 253, 350, 447, 574, 633, 838, 865`
- `backend/src/routes/dashboard.ts:459`
- `backend/src/routes/tickets.ts:63` (has validation via `parsePositiveInt`)

**Example:**
```typescript
// Line 168 - Missing validation
const userId = parseInt(req.params.id);
// If req.params.id is "abc", userId will be NaN
```

**Expected Behavior:**
All `parseInt()` calls should validate the result and return appropriate error responses for invalid input.

**Reproduction Steps:**
1. Make a request to `/management/users/abc/promote`
2. Observe server error or unexpected behavior

**Fix:**
Add validation before using parsed values:
```typescript
const userId = parseInt(req.params.id);
if (isNaN(userId) || userId <= 0) {
  return res.status(400).json({ error: 'Invalid user ID' });
}
```

---

## High Priority Issues

### 3. Race Condition in Frontend Analytics Page
**Location:** `frontend/src/app/(dashboard)/analytics/page.tsx:81-85, 119-123`  
**Severity:** High  
**Impact:** Multiple simultaneous API calls, potential state inconsistencies

**Issue:**
The `useEffect` hooks for fetching staff and non-staff data don't include the fetch functions in their dependency arrays, but they also don't use `useCallback`. This can cause:
- Stale closures
- Multiple simultaneous requests when tab changes rapidly
- Memory leaks if component unmounts during fetch

**Code:**
```typescript
useEffect(() => {
  if (activeTab === 'staff') {
    fetchStaffAnalytics();
  }
}, [activeTab]); // Missing fetchStaffAnalytics in deps
```

**Expected Behavior:**
Either wrap functions in `useCallback` or include them in dependencies, and add cleanup to cancel in-flight requests.

**Reproduction Steps:**
1. Navigate to analytics page
2. Rapidly switch between "Staff Analytics" and "Non-Staff Members" tabs
3. Check network tab for multiple simultaneous requests

**Fix:**
```typescript
const fetchStaffAnalytics = useCallback(async () => {
  // ... existing code
}, []);

useEffect(() => {
  if (activeTab === 'staff') {
    fetchStaffAnalytics();
  }
}, [activeTab, fetchStaffAnalytics]);
```

---

### 4. Inconsistent Error Response Formats
**Location:** Multiple route files  
**Severity:** High  
**Impact:** Frontend error handling may fail or display incorrect messages

**Issue:**
Different endpoints return errors in different formats:
- Some return `{ error: string }`
- Some return `{ error: string, code: string }`
- Some return `{ error: string, message: string }`
- Some return `{ error: string, details: string }`

**Examples:**
- `backend/src/routes/auth.ts` returns `{ error: string, code: string }`
- `backend/src/routes/management.ts` returns `{ error: string }`
- `backend/src/routes/bot.ts` returns `{ error: string, message: string }`

**Expected Behavior:**
All error responses should follow a consistent format.

**Fix:**
Standardize on:
```typescript
{ error: string, code?: string, details?: any }
```

---

### 5. Missing Error Handling for Bot API Calls
**Location:** `backend/src/routes/management.ts:294-324, 387-421, 478-507`  
**Severity:** High  
**Impact:** If bot service is unavailable, operations may fail silently or with unclear errors

**Issue:**
Bot API calls (for notifications) catch errors but don't always provide clear feedback. The operations (promote/demote/terminate) succeed even if notifications fail, but the error handling could be improved.

**Code:**
```typescript
try {
  const notifyResponse = await fetch(`${botApiUrl}/notify-promotion`, {
    // ...
  });
  // ... handle response
} catch (notifyError: any) {
  console.error('Error sending promotion notification:', notifyError);
  dmError = notifyError.message || 'Notification service unavailable';
}
// Operation continues even if notification fails
```

**Expected Behavior:**
- Better error messages for users
- Retry logic for transient failures
- Clear distinction between operation success and notification failure

**Fix:**
Add retry logic and better error categorization.

---

### 6. Potential Memory Leak in Group Sync
**Location:** `backend/src/services/groupSync.ts:219-225`  
**Severity:** High  
**Impact:** Interval may not be cleaned up on server shutdown, causing issues

**Issue:**
The `setInterval` for auto-sync is stored but may not be properly cleaned up during graceful shutdown.

**Code:**
```typescript
syncIntervalId = setInterval(async () => {
  try {
    await performGroupSync();
  } catch (error) {
    console.error('[GroupSync] Scheduled auto-sync failed:', error);
  }
}, SYNC_INTERVAL_MS);
```

**Expected Behavior:**
The interval should be cleared during graceful shutdown.

**Fix:**
Add cleanup in server shutdown handlers:
```typescript
process.on('SIGTERM', () => {
  stopAutoSync();
  // ... other cleanup
});
```

---

### 7. Missing Input Validation for LOA Dates
**Location:** `backend/src/routes/dashboard.ts:406-417`  
**Severity:** High  
**Impact:** Invalid date inputs could cause database errors or unexpected behavior

**Issue:**
Date validation checks if dates are in the past or if end_date < start_date, but doesn't validate:
- Date format
- Maximum date range
- Timezone handling

**Code:**
```typescript
const startDate = new Date(start_date);
const endDate = new Date(end_date);
// No validation if dates are valid Date objects
```

**Expected Behavior:**
Validate date format, range limits, and handle timezone issues.

**Fix:**
Add comprehensive date validation:
```typescript
if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
  return res.status(400).json({ error: 'Invalid date format' });
}
const maxRange = 365; // days
if ((endDate.getTime() - startDate.getTime()) > maxRange * 24 * 60 * 60 * 1000) {
  return res.status(400).json({ error: 'LOA range cannot exceed 365 days' });
}
```

---

### 8. Inconsistent Week Start Calculation
**Location:** Multiple files  
**Severity:** High  
**Impact:** Different parts of the system may calculate weeks differently, causing data inconsistencies

**Issue:**
Week start calculation is implemented in multiple places:
- `backend/src/utils/messages.ts:getCurrentWeekStart()`
- `backend/src/routes/tickets.ts:81-86` (inline calculation)
- `backend/src/routes/dashboard.ts` (similar inline calculation)

**Expected Behavior:**
All week calculations should use the same utility function.

**Fix:**
Replace all inline week calculations with calls to `getCurrentWeekStart()`.

---

### 9. Missing Null Checks in Database Queries
**Location:** Multiple route files  
**Severity:** High  
**Impact:** Null values could cause runtime errors or incorrect behavior

**Issue:**
Some database queries don't handle null values properly, especially when using optional chaining with `as any` casts.

**Example:**
```typescript
const minutes = currentWeekActivity?.minutes ? parseInt(currentWeekActivity.minutes as any) : 0;
// If minutes is null, parseInt(null) returns NaN
```

**Expected Behavior:**
All database values should be validated before use.

**Fix:**
Add explicit null checks:
```typescript
const minutes = currentWeekActivity?.minutes != null 
  ? parseInt(String(currentWeekActivity.minutes)) || 0 
  : 0;
```

---

### 10. Type Safety Issues with `as any` Casts
**Location:** Throughout codebase  
**Severity:** High  
**Impact:** Type errors may be hidden, leading to runtime bugs

**Issue:**
Extensive use of `as any` type assertions bypasses TypeScript's type checking, potentially hiding bugs.

**Examples:**
- `backend/src/routes/management.ts:86` - `parseInt(currentWeekActivity.minutes as any)`
- `backend/src/routes/dashboard.ts:56` - `parseInt(activityLog.minutes as any)`
- Multiple database query results cast to `any[]`

**Expected Behavior:**
Define proper types for database results and avoid `as any` casts.

**Fix:**
Create proper TypeScript interfaces for database results:
```typescript
interface ActivityLog {
  id: number;
  user_id: number;
  week_start: string;
  messages_sent: number;
  minutes: number | null;
  // ...
}
```

---

## Medium Priority Issues

### 11. Missing Cleanup in Frontend useEffect Hooks
**Location:** `frontend/src/hooks/useTickets.ts:23-26`  
**Severity:** Medium  
**Impact:** API requests may continue after component unmounts

**Issue:**
The `useTickets` hook doesn't cancel in-flight requests when the component unmounts or dependencies change.

**Code:**
```typescript
useEffect(() => {
  refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [status]);
```

**Fix:**
Add AbortController for request cancellation:
```typescript
useEffect(() => {
  const controller = new AbortController();
  refresh(controller.signal);
  return () => controller.abort();
}, [status]);
```

---

### 12. Duplicate Week Start Calculation Logic
**Location:** `backend/src/routes/tickets.ts:81-86`  
**Severity:** Medium  
**Impact:** Code duplication, potential for inconsistencies

**Issue:**
Week start is calculated inline instead of using the utility function.

**Fix:**
Replace with `getCurrentWeekStart()` call.

---

### 13. Missing Error Boundary in Frontend
**Location:** Frontend components  
**Severity:** Medium  
**Impact:** Unhandled errors could crash the entire application

**Issue:**
No React error boundaries are implemented to catch and handle component errors gracefully.

**Fix:**
Add error boundaries around major sections of the application.

---

### 14. Inconsistent Boolean Handling for Database
**Location:** `backend/src/routes/dashboard.ts:48`  
**Severity:** Medium  
**Impact:** Database boolean values may not be handled correctly

**Issue:**
Uses `voided = false` which may not work correctly with MySQL boolean types.

**Code:**
```typescript
const infractionCount = await db
  .prepare('SELECT COUNT(*) as count FROM infractions WHERE user_id = ? AND voided = false')
```

**Fix:**
Use `voided = 0` for MySQL or ensure boolean type is properly defined.

---

### 15. Missing Validation for Permission Updates
**Location:** `backend/src/routes/management.ts:166-207`  
**Severity:** Medium  
**Impact:** Invalid permission updates could be accepted

**Issue:**
Permission validation checks for valid flags but doesn't validate edge cases like:
- Updating permissions for non-existent users (handled)
- Updating permissions for immune ranks (not checked)

**Fix:**
Add check for immune ranks before allowing permission updates.

---

### 16. Potential Race Condition in Ticket Claiming
**Location:** `backend/src/routes/tickets.ts:69-78`  
**Severity:** Medium  
**Impact:** Two users might claim the same ticket simultaneously

**Issue:**
The race-safe claim uses a single UPDATE query, but there's a small window where the ticket could be claimed by multiple users if requests arrive simultaneously.

**Current Code:**
```typescript
const claimResult = await db.prepare(
  "UPDATE tickets SET claimed_by = ?, status = 'claimed' WHERE id = ? AND status = 'open'"
).run(req.user.id, ticketId);
```

**Note:** This is actually well-implemented, but could be improved with database-level locking.

**Fix:**
Consider using SELECT FOR UPDATE for additional safety in high-concurrency scenarios.

---

### 17. Missing Timeout for External API Calls
**Location:** `backend/src/routes/management.ts:298`  
**Severity:** Medium  
**Impact:** Bot API calls could hang indefinitely

**Issue:**
`fetch()` calls to bot API don't have explicit timeouts, which could cause requests to hang.

**Fix:**
Add timeout using AbortController:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
const response = await fetch(url, { signal: controller.signal });
clearTimeout(timeoutId);
```

---

### 18. Inconsistent Array Handling
**Location:** `frontend/src/app/(dashboard)/analytics/page.tsx:59`  
**Severity:** Medium  
**Impact:** Non-array responses could cause runtime errors

**Issue:**
Code checks `Array.isArray()` but the check happens after potential errors.

**Code:**
```typescript
const members = Array.isArray(response.data) ? response.data : [];
```

**Note:** This is actually correct, but could be improved with better type guards.

---

### 19. Missing Validation for Tracked Channel Names
**Location:** `backend/src/routes/management.ts:542-567`  
**Severity:** Medium  
**Impact:** Invalid channel names could be stored

**Issue:**
No validation for channel name format or length.

**Fix:**
Add validation:
```typescript
if (channel_name.length > 255 || channel_name.length < 1) {
  return res.status(400).json({ error: 'Invalid channel name length' });
}
```

---

### 20. Potential Division by Zero in Quota Calculation
**Location:** `backend/src/routes/management.ts:95`  
**Severity:** Medium  
**Impact:** If messages_quota is 0, division by zero could occur

**Issue:**
Quota percentage calculation doesn't check for zero quota.

**Code:**
```typescript
const quotaPercentage = Math.min(Math.round((finalMessagesSent / messagesQuota) * 100), 100);
```

**Note:** Since `messagesQuota` is hardcoded to 150, this is unlikely but should be validated.

**Fix:**
Add check:
```typescript
const quotaPercentage = messagesQuota > 0 
  ? Math.min(Math.round((finalMessagesSent / messagesQuota) * 100), 100)
  : 0;
```

---

## Low Priority Issues

### 21. Console.log Statements in Production Code
**Location:** Multiple files  
**Severity:** Low  
**Impact:** Performance and information leakage

**Issue:**
Extensive use of `console.log` throughout the codebase, which should be replaced with a proper logging library.

**Fix:**
Implement a logging library (e.g., Winston, Pino) with log levels.

---

### 22. Missing JSDoc Comments
**Location:** Throughout codebase  
**Severity:** Low  
**Impact:** Reduced code maintainability

**Issue:**
Many functions lack JSDoc comments explaining parameters, return values, and behavior.

**Fix:**
Add JSDoc comments to all public functions.

---

### 23. Hardcoded Values
**Location:** Multiple files  
**Severity:** Low  
**Impact:** Reduced configurability

**Issue:**
Some values are hardcoded (e.g., quota of 150, sync interval of 30 minutes) that could be environment variables.

**Examples:**
- `backend/src/routes/management.ts:93` - `const messagesQuota = 150;`
- `backend/src/services/groupSync.ts:5` - `const SYNC_INTERVAL_MS = 30 * 60 * 1000;`

**Fix:**
Move to environment variables or configuration file.

---

## Performance Concerns

### 1. N+1 Query Problem in Management Endpoint
**Location:** `backend/src/routes/management.ts:70-132`  
**Impact:** High number of database queries for large staff lists

**Issue:**
The `/management/users` endpoint performs a separate query for each user to get activity logs, tickets, and message counts.

**Current:** For 10 users, this results in ~30+ queries (1 for users, 10 for activity logs, 10 for tickets, 10 for message counts)

**Fix:**
Use JOINs or batch queries to reduce database round trips:
```typescript
// Batch fetch all activity logs
const activityLogs = await db.prepare(
  'SELECT * FROM activity_logs WHERE week_start = ? AND user_id IN (?)'
).all(weekStart, userIds);
```

---

### 2. Missing Database Indexes
**Location:** Database schema  
**Impact:** Slow queries on large datasets

**Issue:**
Some frequently queried columns may lack indexes:
- `activity_logs.week_start`
- `discord_messages.created_at`
- `tickets.claimed_by`

**Fix:**
Review query patterns and add appropriate indexes.

---

### 3. Unnecessary Re-renders in Frontend
**Location:** `frontend/src/app/(dashboard)/analytics/page.tsx`  
**Impact:** Performance degradation with large staff lists

**Issue:**
The analytics page re-renders the entire list on every state change, even for small updates.

**Fix:**
Implement React.memo for list items and use virtualization for large lists.

---

## Edge Cases and Boundary Conditions

### 1. Empty State Handling
**Status:** Generally well-handled  
**Note:** Most endpoints return empty arrays correctly, but some error messages could be more user-friendly.

### 2. Concurrent Request Handling
**Status:** Partially handled  
**Note:** Ticket claiming has race condition protection, but other operations could benefit from similar protection.

### 3. Network Failure Handling
**Status:** Partially handled  
**Note:** Frontend has some network error handling, but could be more comprehensive.

### 4. Large Dataset Handling
**Status:** Needs improvement  
**Note:** No pagination implemented for staff lists, which could cause issues with large datasets.

---

## Recommendations

1. **Immediate Actions:**
   - Fix SQL syntax bug in `checkWeeklyQuotas()` (Critical #1)
   - Add NaN validation for all `parseInt()` calls (Critical #2)
   - Fix race conditions in frontend (High #3)

2. **Short-term Improvements:**
   - Standardize error response formats (High #4)
   - Improve bot API error handling (High #5)
   - Fix memory leaks (High #6)
   - Add input validation (High #7, #8)

3. **Long-term Enhancements:**
   - Refactor to eliminate `as any` casts (High #10)
   - Implement proper logging (Low #21)
   - Add pagination for large datasets
   - Optimize database queries (Performance #1)

---

## Testing Recommendations

1. **Unit Tests:**
   - Week start calculation functions
   - Input validation functions
   - Date parsing and validation

2. **Integration Tests:**
   - Bot API communication
   - Database transaction handling
   - Concurrent request scenarios

3. **E2E Tests:**
   - Complete user workflows
   - Error scenarios
   - Edge cases (empty states, large datasets)

---

## Conclusion

The system is generally well-structured, but several critical and high-priority issues need immediate attention. The most critical issues are the SQL syntax bug and missing input validation, which could cause system failures. Addressing the high-priority issues will significantly improve system reliability and user experience.

**Priority Order:**
1. Critical issues (#1, #2)
2. High priority issues (#3-#10)
3. Medium priority issues (#11-#20)
4. Low priority issues (#21-#23)
5. Performance optimizations

---

**Report End**

