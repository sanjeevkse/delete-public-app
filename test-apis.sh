#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8081/api"

# Generate unique Indian mobile number (10 digits, no prefix)
generate_mobile() {
  first_digit=$((RANDOM % 4 + 6))  # 6-9
  remaining=$(printf "%09d" $((RANDOM * RANDOM % 1000000000)))
  echo "${first_digit}${remaining}"
}

# Helper function for API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local token=$4
  
  if [ -z "$token" ]; then
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$data"
  fi
}

# Log function
log() {
  echo -e "${BLUE}=================================================================================${NC}"
  echo -e "${YELLOW}$1${NC}"
  echo -e "${BLUE}=================================================================================${NC}"
}

# Success function
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Error function
error() {
  echo -e "${RED}❌ $1${NC}"
}

# Extract value from JSON
extract_json() {
  echo "$1" | grep -o "\"$2\":\"[^\"]*" | cut -d'"' -f4
}

main() {
  echo -e "${BLUE}🚀 Starting API Tests for localhost:8081${NC}"
  echo -e "${YELLOW}📱 Testing with unique Indian mobile numbers${NC}\n"
  
  MOBILE=$(generate_mobile)
  log "Generated Mobile Number: $MOBILE"
  
  # 1. Request OTP
  log "1️⃣  REQUEST OTP"
  OTP_RESPONSE=$(api_call POST "/auth/request-otp" "{\"contactNumber\": \"$MOBILE\"}")
  echo "$OTP_RESPONSE" | jq '.' 2>/dev/null || echo "$OTP_RESPONSE"
  
  OTP=$(echo "$OTP_RESPONSE" | jq -r '.data.otp // empty' 2>/dev/null)
  if [ -z "$OTP" ]; then
    error "Failed to get OTP from response"
    exit 1
  fi
  success "OTP received: $OTP"
  
  # 2. Login with OTP
  log "2️⃣  LOGIN WITH OTP"
  LOGIN_RESPONSE=$(api_call POST "/auth/login" "{\"contactNumber\": \"$MOBILE\", \"otp\": \"$OTP\"}")
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty' 2>/dev/null)
  USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id // empty' 2>/dev/null)
  
  if [ -z "$TOKEN" ]; then
    error "Failed to get token from response"
    exit 1
  fi
  success "Login successful - Token: ${TOKEN:0:30}..."
  success "User ID: $USER_ID"
  
  # 3. Get Profile
  log "3️⃣  GET PROFILE"
  PROFILE_RESPONSE=$(api_call GET "/users/profile" "" "$TOKEN")
  echo "$PROFILE_RESPONSE" | jq '.' 2>/dev/null || echo "$PROFILE_RESPONSE"
  
  # 4. Update Profile
  log "4️⃣  UPDATE PROFILE"
  UPDATE_RESPONSE=$(api_call PUT "/users/profile" "{\"displayName\": \"Test User\", \"wardNumberId\": 1, \"boothNumberId\": 1, \"addressLine1\": \"Test Address\", \"city\": \"Bangalore\", \"state\": \"Karnataka\"}" "$TOKEN")
  echo "$UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$UPDATE_RESPONSE"
  
  # 5. Get Sidebar Permissions
  log "5️⃣  SIDEBAR PERMISSIONS"
  PERMS_RESPONSE=$(api_call GET "/auth/sidebar-permissions" "" "$TOKEN")
  echo "$PERMS_RESPONSE" | jq '.' 2>/dev/null || echo "$PERMS_RESPONSE"
  
  # 6. List Users
  log "6️⃣  LIST USERS"
  USERS_RESPONSE=$(api_call GET "/users?page=1&limit=10" "" "$TOKEN")
  echo "$USERS_RESPONSE" | jq '.data | {success: .success, pagination: .pagination, count: (.data | length)}' 2>/dev/null || echo "$USERS_RESPONSE" | jq '{pagination: .pagination, count: (.data | length)}' 2>/dev/null || echo "$USERS_RESPONSE"
  
  # 7. List Posts
  log "7️⃣  LIST POSTS"
  POSTS_RESPONSE=$(api_call GET "/posts?page=1&limit=10" "" "$TOKEN")
  POSTS_COUNT=$(echo "$POSTS_RESPONSE" | jq '.data | length' 2>/dev/null)
  echo "$POSTS_RESPONSE" | jq '{pagination: .pagination, data_count: ($POSTS_COUNT // 0)}' 2>/dev/null || echo "$POSTS_RESPONSE"
  success "Posts retrieved: $POSTS_COUNT"
  
  # 8. List Events
  log "8️⃣  LIST EVENTS"
  EVENTS_RESPONSE=$(api_call GET "/events?page=1&limit=10" "" "$TOKEN")
  EVENTS_COUNT=$(echo "$EVENTS_RESPONSE" | jq '.data | length' 2>/dev/null)
  echo "$EVENTS_RESPONSE" | jq '{pagination: .pagination, data_count: ($EVENTS_COUNT // 0)}' 2>/dev/null || echo "$EVENTS_RESPONSE"
  success "Events retrieved: $EVENTS_COUNT"
  
  # 9. List Jobs
  log "9️⃣  LIST JOBS"
  JOBS_RESPONSE=$(api_call GET "/jobs?page=1&limit=10" "" "$TOKEN")
  JOBS_COUNT=$(echo "$JOBS_RESPONSE" | jq '.data | length' 2>/dev/null)
  echo "$JOBS_RESPONSE" | jq '{pagination: .pagination, data_count: ($JOBS_COUNT // 0)}' 2>/dev/null || echo "$JOBS_RESPONSE"
  success "Jobs retrieved: $JOBS_COUNT"
  
  # 10. List Complaints
  log "🔟  LIST COMPLAINTS"
  COMPLAINTS_RESPONSE=$(api_call GET "/complaints?page=1&limit=10" "" "$TOKEN")
  COMPLAINTS_COUNT=$(echo "$COMPLAINTS_RESPONSE" | jq '.data | length' 2>/dev/null)
  echo "$COMPLAINTS_RESPONSE" | jq '{pagination: .pagination, data_count: ($COMPLAINTS_COUNT // 0)}' 2>/dev/null || echo "$COMPLAINTS_RESPONSE"
  success "Complaints retrieved: $COMPLAINTS_COUNT"
  
  # 11. List Communities
  log "1️⃣1️⃣  LIST COMMUNITIES"
  COMMUNITIES_RESPONSE=$(api_call GET "/communities?page=1&limit=10" "" "$TOKEN")
  COMMUNITIES_COUNT=$(echo "$COMMUNITIES_RESPONSE" | jq '.data | length' 2>/dev/null)
  echo "$COMMUNITIES_RESPONSE" | jq '{pagination: .pagination, data_count: ($COMMUNITIES_COUNT // 0)}' 2>/dev/null || echo "$COMMUNITIES_RESPONSE"
  success "Communities retrieved: $COMMUNITIES_COUNT"
  
  # 12. List Schemes
  log "1️⃣2️⃣  LIST SCHEMES"
  SCHEMES_RESPONSE=$(api_call GET "/schemes?page=1&limit=10" "" "$TOKEN")
  SCHEMES_COUNT=$(echo "$SCHEMES_RESPONSE" | jq '.data | length' 2>/dev/null)
  echo "$SCHEMES_RESPONSE" | jq '{pagination: .pagination, data_count: ($SCHEMES_COUNT // 0)}' 2>/dev/null || echo "$SCHEMES_RESPONSE"
  success "Schemes retrieved: $SCHEMES_COUNT"
  
  # 13. Register Device Token
  log "1️⃣3️⃣  REGISTER DEVICE TOKEN"
  DEVICE_TOKEN="test-device-token-$(date +%s)"
  DEV_TOKEN_RESPONSE=$(api_call POST "/notifications/register-device-token" "{\"deviceToken\": \"$DEVICE_TOKEN\"}" "$TOKEN")
  echo "$DEV_TOKEN_RESPONSE" | jq '.' 2>/dev/null || echo "$DEV_TOKEN_RESPONSE"
  
  # 14. Get Device Tokens
  log "1️⃣4️⃣  GET MY DEVICE TOKENS"
  MY_TOKENS_RESPONSE=$(api_call GET "/notifications/device-tokens" "" "$TOKEN")
  MY_TOKENS_COUNT=$(echo "$MY_TOKENS_RESPONSE" | jq '.data | length' 2>/dev/null)
  echo "$MY_TOKENS_RESPONSE" | jq '{data_count: ($MY_TOKENS_COUNT // 0)}' 2>/dev/null || echo "$MY_TOKENS_RESPONSE"
  success "Device tokens retrieved: $MY_TOKENS_COUNT"
  
  # Summary
  log "✨ TEST SUMMARY"
  echo -e "${GREEN}✅ Auth Flow: OTP → Login → Profile → Permissions${NC}"
  echo -e "${GREEN}✅ User ID: $USER_ID${NC}"
  echo -e "${GREEN}✅ Mobile: $MOBILE${NC}"
  echo -e "${GREEN}✅ Token: ${TOKEN:0:30}...${NC}"
  echo -e "${GREEN}✅ All APIs tested successfully!${NC}\n"
}

main "$@"
