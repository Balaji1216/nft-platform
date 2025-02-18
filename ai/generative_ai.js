const axios = require("axios");

module.exports = {
    dalle: {
        generateImage: async function (prompt) {
            if (!prompt || typeof prompt !== "string") {
                throw new Error("Invalid prompt. It should be a non-empty string.");
            }

            try {
                const response = await axios.post("http://127.0.0.1:7860/sdapi/v1/txt2img", {
                    prompt: prompt,
                    steps: 20,
                    width: 512,
                    height: 512,
                });

                return response.data.images[0]; // Base64 encoded image
            } catch (error) {
                console.error("Error generating image:", error.response?.data || error.message);
                throw new Error("Failed to generate image. Please try again later.");
            }
        }
    }
};
