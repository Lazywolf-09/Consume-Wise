import React, { useState, useRef, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MarkdownIt from "markdown-it";
import { maybeShowApiKeyBanner } from "./gemini-banner-api";
import Webcam from "react-webcam";
import "./FoodProductAnalysis.css";

const API_KEY = "Your API Key"; // Use API key from environment variable

const FoodProductAnalysis = () => {
  const [imageSrcBrand, setImageSrcBrand] = useState(null); // Holds the captured image for brand
  const [imageSrcNutritional, setImageSrcNutritional] = useState(null); // Holds the captured image for nutritional values
  const [output, setOutput] = useState("(Results will appear here)");
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for sidebar toggle

  // Display banner if API key is not set correctly
  maybeShowApiKeyBanner(API_KEY);

  // Webcam video constraints for mobile and laptop
  const videoConstraints = {
    facingMode: { ideal: "environment" }, // Tries to use rear camera on mobile
    width: { ideal: 640 }, // Reduced width for the webcam
    height: { ideal: 480 },
  };

  // Capture image for brand
  const captureBrand = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImageSrcBrand(imageSrc); // Save brand image
  }, [webcamRef]);

  // Capture image for nutritional values
  const captureNutritional = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImageSrcNutritional(imageSrc); // Save nutritional values image
  }, [webcamRef]);

  // Handle file upload for brand image
  const handleFileUploadBrand = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrcBrand(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file upload for nutritional values image
  const handleFileUploadNutritional = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrcNutritional(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sidebar toggle function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setOutput("Generating...");
    setLoading(true);

    try {
      if (!imageSrcBrand || !imageSrcNutritional) {
        setOutput("Please capture or upload both the brand image and nutritional values image.");
        setLoading(false);
        return;
      }

      // Predefined prompt for food product analysis
      const prompt = `
      Extract and organize the following key data from the two provided images. The first image contains the brand information, and the second image contains the nutritional information:

      1. **Product Information**
      - **Product Name**: Extract from the first image.
      - **Brand Name**: Extract from the first image.
      - **Quantity**: Extract if available from the first image.
      - **Total Weight**: Extract if available from the first image.

      2. **Nutritional Details**
      - **Serving Size**: Extract from the second image.

      | Nutrient          | Per 100g |
      |-------------------|----------|
      | Energy (kcal)     |          |
      | Protein (g)       |          |
      | Carbohydrate (g)  |          |
      | Total Sugars (g)  |          |
      | Added Sugars (g)  |          |
      | Total Fat (g)     |          |
      | Trans Fat (g)     |          |
      | Saturated Fat (g) |          |
      | Cholesterol (mg)  |          |
      | Sodium (mg)       |          |

      3. **Proprietary Claims**
      - List any notable claims such as brand promises or unique selling points (e.g., sugar-free, trans-fat-free, etc.).
      - **Misleading Claims**: Verify if any proprietary claims made on the label could be misleading based on the nutritional data.
    
      4. **Product Category**
      - Indicate the category of the product (e.g., Snack, Beverage).
    
      5. **Additional Insights**
      - **Purpose**: Classify the product's purpose (e.g., nutritional, regular, recreational).
      - **Usage Frequency**: Suggest how often the product should be consumed (e.g., Daily, Weekly, Monthly).
      - **Eco-Friendliness**: Indicate whether the packaging is eco-friendly or if the information is missing on the label.
      - **Health and Environmental Insights**: Provide any relevant insights regarding health considerations (e.g., harmful ingredients) and environmental impact based on the product's nutritional and packaging details.
      - **Dietary Compliance**: Indicate if the product is suitable for specific dietary needs (e.g., diabetes-friendly, allergen-free).

      6. **Demographic Considerations**
      - **Age**: Consider how the product may be suitable or unsuitable for different age groups (e.g., children, adults, seniors).
      - **Gender**: Analyze if the product is tailored for specific gender-related nutritional needs or preferences (e.g., women's health, men's health).
`;


      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash", // or gemini-1.5-pro
      });

      const contents = [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: imageSrcBrand.split(",")[1] } },
            { text: "This image contains the brand and product information." },
            { inline_data: { mime_type: "image/jpeg", data: imageSrcNutritional.split(",")[1] } },
            { text: "This image contains the nutritional values." },
            { text: prompt },
          ],
        },
      ];

      const result = await model.generateContentStream({ contents });

      let buffer = [];
      let md = new MarkdownIt();

      for await (let response of result.stream) {
        try {
          buffer.push(response.text());
          const textOutput = md.render(buffer.join(""));
          setOutput(textOutput);
        } catch (streamError) {
          setOutput(`An error occurred: ${streamError.message}`);
        }
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Analyze Food Product</h1>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <h2>History</h2>
        {/* Sidebar content can be added here */}
        <p>Your previously analyzed products will appear here.</p>
      </div>

      {/* Sidebar toggle button */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {sidebarOpen ? "Close History" : "Show History"}
      </button>

      <form onSubmit={handleSubmit}>
        <div className="webcam-container">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            width="80%"
            height="60%"
          />
        </div>

        <div className="button-container">
          {/* Buttons to capture brand image */}
          <button className="capture-button" type="button" onClick={captureBrand}>
            Capture Brand Image
          </button>
          <input
            type="file"
            id="file-brand"
            accept="image/*"
            onChange={handleFileUploadBrand}
            className="file-input"
          />
          <label htmlFor="file-brand" className="pin-button">
            Pin Brand Image
          </label>
        </div>

        <div className="button-container">
          {/* Buttons to capture nutritional values image */}
          <button className="capture-button" type="button" onClick={captureNutritional}>
            Capture Nutritional Values Image
          </button>
          <input
            type="file"
            id="file-nutritional"
            accept="image/*"
            onChange={handleFileUploadNutritional}
            className="file-input"
          />
          <label htmlFor="file-nutritional" className="pin-button">
            Pin Nutritional Values Image
          </label>
        </div>

        {imageSrcBrand && (
          <div className="image-preview">
            <h4>Captured or Uploaded Brand Image:</h4>
            <img src={imageSrcBrand} alt="Brand" className="captured-image" />
          </div>
        )}

        {imageSrcNutritional && (
          <div className="image-preview">
            <h4>Captured or Uploaded Nutritional Values Image:</h4>
            <img src={imageSrcNutritional} alt="Nutritional" className="captured-image" />
          </div>
        )}

        <div className="button-container">
          <button className="analyze-button" type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </form>

      <p className="output" dangerouslySetInnerHTML={{ __html: output }} />
    </main>
  );
};

export default FoodProductAnalysis;
