import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import campfireImage from "../assets/images/landing/story/HomeDesign.webp";
import mountainCategoryImage from "../assets/images/landing/categories/mountain.webp";
import beachCategoryImage from "../assets/images/landing/categories/beach.webp";
import culturalCategoryImage from "../assets/images/landing/categories/cultrual.webp";
import weekendCategoryImage from "../assets/images/landing/categories/weekend.webp";
import LandingHeroSection from "../components/landing/LandingHeroSection";
import WhatWeOfferSection from "../components/landing/WhatWeOfferSection";
import PopularCategoriesSection from "../components/landing/PopularCategoriesSection";
import TopPicksSection from "../components/landing/TopPicksSection";
import StatsBandSection from "../components/landing/StatsBandSection";
import StorySection from "../components/landing/StorySection";

export default function LandingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ from: "", to: "", date: "" });
  const topPickTripTypes = [
    {
      title: "Mountain Treks",
      subtitle: "Himalayan basecamps and ridge hikes",
      badge: "Adventure",
      image: mountainCategoryImage,
    },
    {
      title: "Beach Escapes",
      subtitle: "Sunset stays and island hopping",
      badge: "Relax",
      image: beachCategoryImage,
    },
    {
      title: "Cultural Trails",
      subtitle: "Heritage cities and local stories",
      badge: "Culture",
      image: culturalCategoryImage,
    },
    {
      title: "Weekend Getaways",
      subtitle: "Quick, budget-friendly short trips",
      badge: "Quick",
      image: weekendCategoryImage,
    },
  ];

  const onSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams(form);
    navigate(`/trips/search?${params.toString()}`);
  };

  return (
    <MainLayout>
      <LandingHeroSection form={form} setForm={setForm} onSubmit={onSubmit} />
      <WhatWeOfferSection />
      <PopularCategoriesSection
        tripTypes={topPickTripTypes}
        onExplore={() => navigate("/trips/search")}
      />
      <TopPicksSection onExplore={() => navigate("/trips/search")} />
      <StatsBandSection />
      <StorySection campfireImage={campfireImage} />
    </MainLayout>
  );
}
