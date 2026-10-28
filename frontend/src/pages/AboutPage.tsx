import React from 'react';
import { ShieldCheck, Heart, Leaf, Users, CheckCircle2, Award } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-rootly-forest bg-rootly-sageMist px-3 py-1 rounded-full">
          Sri Adithya Organics Story
        </span>
        <h1 className="font-display font-black text-3xl sm:text-5xl text-stone-900 tracking-tight leading-tight">
          Traditional Marachekku & Pure Organics <br />
          <span className="italic font-serif font-normal text-rootly-forest">From Living Soil to Your Kitchen.</span>
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          <strong>Sri Adithya Organics</strong> was founded with a singular conviction: genuine organic groceries and traditional wood-pressed oils (Marachekku) should not be an expensive luxury or an ambiguous marketing label. They should be authentic, unadulterated, pressed with ancestral craftsmanship, and delivered fresh with modern speed.
        </p>
      </div>

      {/* Hero Visual */}
      <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=1200"
          alt="Regenerative Indian Organic Farm"
          className="w-full h-72 sm:h-96 object-cover"
        />
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rootly-sageMist text-rootly-forest flex items-center justify-center">
            <Leaf className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-stone-900">Zero Synthetic Chemicals</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Every grower collective we partner with follows certified natural farming — using cow manure, neem cake, and bio-fermented compost instead of chemical nitrogen, pesticides, or glyphosate.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rootly-sageMist text-rootly-forest flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-stone-900">Truth in Every Label</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            We never invent certifications or make misleading therapeutic health claims. Sourcing origins, farm locations, and processing methods are stated truthfully on every product page.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rootly-sageMist text-rootly-forest flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-stone-900">Fair Farmer Prosperity</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            By eliminating multiple layers of mandis and middlemen, our partner farmers receive guaranteed fair prices up to 35% above conventional wholesale rates.
          </p>
        </div>
      </div>

      {/* Sourcing Pledge Card */}
      <div className="p-8 sm:p-10 rounded-3xl bg-rootly-forest text-white shadow-xl space-y-4">
        <h3 className="font-display font-black text-2xl text-white">Our 5-Point Quality Check</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-200">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-rootly-sagePale shrink-0 mt-0.5" />
            <span>NPOP & Jaivik Bharat government compliance checked before farm onboarding.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-rootly-sagePale shrink-0 mt-0.5" />
            <span>Zero calcium carbide or artificial chemical ripening agents for fruits.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-rootly-sagePale shrink-0 mt-0.5" />
            <span>Traditional wood-pressed Kachi Ghani oils with no industrial solvent leaching.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-rootly-sagePale shrink-0 mt-0.5" />
            <span>Cold stone-chakki grinding for flours to retain the vital nutrient-rich germ.</span>
          </div>
        </div>
      </div>

    </div>
  );
};

