/* eslint-env node */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Webhook for Kakao i Open Builder
 * Endpoint: /kakaoChat
 */
exports.kakaoChat = functions.https.onRequest(async (req, res) => {
    // 1. Validate request (optional but recommended)
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        // 2. Extract message from Kakao payload
        // The structure depends on what you send, but typically:
        // req.body.userRequest.utterance is the raw text
        const body = req.body;
        let userMessage = "";
        let userId = "unknown";

        if (body.userRequest) {
            userMessage = body.userRequest.utterance;
            if (body.userRequest.user) {
                userId = body.userRequest.user.id;
            }
        }

        // 3. Save to Firebase Realtime Database
        // Only save if we actually have text
        if (userMessage) {
            await admin.database().ref("items").push({
                text: userMessage,
                x: Math.floor(Math.random() * 500) + 100, // Random X position
                y: Math.floor(Math.random() * 500) + 100, // Random Y position
                userId: userId,
                createdAt: admin.database.ServerValue.TIMESTAMP,
            });
        }

        // 4. Respond to Kakao (Start Block)
        // You must return a valid JSON response so the bot doesn't error out.
        const responseBody = {
            version: "2.0",
            template: {
                outputs: [
                    {
                        simpleText: {
                            text: "Message sent to the screen!",
                        },
                    },
                ],
            },
        };

        res.status(200).send(responseBody);
    } catch (error) {
        console.error("Error processing Kakao Webhook:", error);
        res.status(500).send({
            version: "2.0",
            template: {
                outputs: [
                    {
                        simpleText: {
                            text: "Error sending message.",
                        },
                    },
                ],
            },
        });
    }
});
