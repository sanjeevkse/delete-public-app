#!/bin/bash

# Update Event Creation Flow
sed -i '' \
  -e 's/pm.collectionVariables.set("otp", jsonData.otp);/pm.collectionVariables.set("otp", jsonData.data.otp);/g' \
  -e 's/console.log("OTP received:", jsonData.otp);/console.log("OTP received:", jsonData.data.otp);/g' \
  -e 's/pm.collectionVariables.set("authToken", jsonData.token);/pm.collectionVariables.set("authToken", jsonData.data.token);/g' \
  -e 's/pm.collectionVariables.set("userId", jsonData.user.id);/pm.collectionVariables.set("userId", jsonData.data.user.id);/g' \
  -e 's/console.log("User ID:", jsonData.user.id);/console.log("User ID:", jsonData.data.user.id);/g' \
  -e 's/pm.expect(jsonData.token)/pm.expect(jsonData.data.token)/g' \
  -e 's/pm.collectionVariables.set("eventId", jsonData.id);/pm.collectionVariables.set("eventId", jsonData.data.id);/g' \
  -e 's/console.log("Event created with ID:", jsonData.id);/console.log("Event created with ID:", jsonData.data.id);/g' \
  -e 's/pm.expect(jsonData.id).to.equal/pm.expect(jsonData.data.id).to.equal/g' \
  -e 's/pm.expect(jsonData.message).to.include/pm.expect(jsonData.error.message).to.include/g' \
  "Event Creation Flow.postman_collection.json"

# Update Roles Management Flow  
sed -i '' \
  -e 's/pm.collectionVariables.set("otp", jsonData.otp);/pm.collectionVariables.set("otp", jsonData.data.otp);/g' \
  -e 's/pm.collectionVariables.set("authToken", jsonData.token);/pm.collectionVariables.set("authToken", jsonData.data.token);/g' \
  -e 's/pm.expect(jsonData.token)/pm.expect(jsonData.data.token)/g' \
  -e 's/pm.expect(jsonData.message).to.include/pm.expect(jsonData.error.message).to.include/g' \
  "Roles_Management_Flow.postman_collection.json"

echo "Postman test scripts updated"
