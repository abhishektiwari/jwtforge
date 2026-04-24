# Postman Auto-Token Capture Setup

## Quick Fix: Add Test Scripts for Auto-Token Capture

To automatically save tokens from responses, add **Test scripts** to each request.

### How to Add Test Scripts

1. Open a token generation request (e.g., "Generate Token - Basic")
2. Click the **Tests** tab (next to Body)
3. Paste the appropriate script below
4. Click **Save**
5. Run the request - token will auto-save to variable

---

## Test Scripts for Each Request

### JWT Token Generation Requests

**For: "Generate Token - Basic", "With Scope", "ID Token", "Custom Claims"**

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("jwt_token", jsonData.access_token);
    console.log("✓ JWT Token saved to {{jwt_token}}");
}
```

---

### Client Credentials Grant Requests

**For: "Generate Token - Basic (No Scope)", "With Scope", "With Custom Subject"**

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("cc_token", jsonData.access_token);
    console.log("✓ Client Credentials Token saved to {{cc_token}}");
}
```

---

### Token Exchange Requests

**For: "Exchange Token - Basic", "With Resource", "With Claim Transformation"**

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("exchanged_token", jsonData.access_token);
    console.log("✓ Exchanged Token saved to {{exchanged_token}}");
}
```

**For: "Exchange Token - Multi-Hop"** (uses already exchanged token)

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("exchanged_token", jsonData.access_token);
    console.log("✓ Multi-Hop Exchanged Token saved to {{exchanged_token}}");
}
```

---

## Testing the Setup

### Step 1: Verify Environment Variables
1. Top-right dropdown → Select environment (Dev or Prod)
2. Click eye icon to view variables
3. Should see:
   - `base_url`: Your service URL
   - `client_id`: `client_123`
   - `basic_auth`: `Y2xpZW50XzEyMzpjbGllbnRfMTIz`
   - `jwt_token`: Empty (will be filled)
   - `cc_token`: Empty (will be filled)
   - `exchanged_token`: Empty (will be filled)

### Step 2: Add Test Scripts
1. Open "JWT Token Generation" → "Generate Token - Basic"
2. Go to **Tests** tab
3. Paste the JWT script above
4. Save

### Step 3: Run and Verify
1. Click **Send**
2. Wait for response
3. Check the **Tests** tab results
4. You should see: `✓ JWT Token saved to {{jwt_token}}`
5. View environment to see token was saved

### Step 4: Use Saved Token
1. Open "Introspect JWT Token" request
2. The `token` field already uses `{{jwt_token}}`
3. Click **Send** - it will use the previously saved token
4. Should get response with `"active": true`

---

## Complete Workflow with Auto-Capture

### JWT Token Flow (with auto-capture)
```
1. Run "Generate Token - Basic"
   ↓ (Test script automatically saves access_token to {{jwt_token}})
2. Run "Introspect JWT Token"
   ↓ (Uses {{jwt_token}} automatically)
3. Get introspection response
```

### Client Credentials Flow (with auto-capture)
```
1. Run "Generate Token - Basic (No Scope)"
   ↓ (Test script automatically saves access_token to {{cc_token}})
2. Run "Introspect Client Credentials Token"
   ↓ (Uses {{cc_token}} automatically)
3. Get introspection response
```

### Token Exchange Flow (with auto-capture)
```
1. Run "Generate Token - Basic" (JWT folder)
   ↓ (Saves to {{jwt_token}})
2. Run "Exchange Token - Basic"
   ↓ (Uses {{jwt_token}}, saves to {{exchanged_token}})
3. Run "Introspect Exchanged Token"
   ↓ (Uses {{exchanged_token}} automatically)
4. Get introspection response
```

---

## Troubleshooting

### Tokens Not Being Saved
1. Check response code is 200
2. Verify Test script is in the **Tests** tab (not Body or other tabs)
3. Check console for error messages (Postman → View → Show Postman Console)

### "{{jwt_token}} is Empty"
1. Did you run the token generation request first?
2. Did you add the Test script?
3. Check that response has `access_token` field
4. View environment variables (eye icon) - should show the token value

### Introspect Still Failing
1. Verify `{{basic_auth}}` is set: `Y2xpZW50XzEyMzpjbGllbnRfMTIz`
2. Verify Authorization header shows: `Basic {{basic_auth}}`
3. Check that `{{jwt_token}}` has a value (view environment)
4. Try copying the token manually from a generation request response

### Token Expires
Tokens expire after 3600 seconds (1 hour). If you're testing over a long period:
1. Re-run the generation request to get a fresh token
2. Test script will update the variable with new token

---

## Advanced: Environment Variables Reference

All variables in the environment:

| Variable | Type | How It Gets Set | Usage |
|----------|------|-----------------|-------|
| `base_url` | Manual | Environment file | All requests use `{{base_url}}/token` |
| `client_id` | Manual | Environment file | Reference (used in headers/body) |
| `basic_auth` | Manual | Environment file | `Authorization: Basic {{basic_auth}}` |
| `jwt_token` | Auto | Test script in JWT requests | Introspect requests use this |
| `cc_token` | Auto | Test script in CC requests | Introspect CC uses this |
| `exchanged_token` | Auto | Test script in Exchange requests | Multi-hop exchange uses this |

---

## Manual Token Usage (if auto-capture fails)

If test scripts aren't working:

1. Run a token generation request
2. Copy the `access_token` value from response
3. Right-click on variable name (e.g., `{{jwt_token}}`)
4. Select "Set as variable" → "Environment"
5. Paste the token value
6. Click Set
7. Now Introspect requests will use the manually set token

---

## Summary

✅ **Do This:**
- Add Test scripts to token generation requests
- Test scripts automatically save `access_token` to variables
- Introspect requests automatically use saved tokens
- Workflow is: Generate → (auto-save) → Introspect

❌ **Don't Do This:**
- Manually copy/paste tokens each time
- Leave `{{jwt_token}}` empty and manually enter token in requests
- Forget to run generation request before running introspect

---

## Example: Complete JWT Test Sequence

1. **Open Environment:**
   - Top-right: Select "JWTForge - Development"
   - View variables with eye icon

2. **Setup JWT Request:**
   - Expand "JWT Token Generation"
   - Click "Generate Token - Basic"
   - Go to **Tests** tab
   - Paste JWT script above
   - Save (Ctrl+S)

3. **Run Token Generation:**
   - Click **Send**
   - See 200 OK response
   - See `access_token` in response body
   - Check Tests tab: should show ✓ message

4. **Verify Token Saved:**
   - View environment (eye icon)
   - `{{jwt_token}}` should have value (not empty)

5. **Run Introspect:**
   - Expand "JWT Token Generation"
   - Click "Introspect JWT Token"
   - Click **Send**
   - Should see `"active": true` in response
   - All token claims visible

6. **Success!**
   - Tokens auto-captured ✓
   - Introspection working ✓
   - Basic auth working ✓

---

Done! Your Postman collection will now auto-capture tokens and maintain them across requests.
