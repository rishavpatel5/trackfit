"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, ShieldAlert } from "lucide-react";

export const GYM_RULES_SECTIONS = [
  {
    category: "General Member Conduct",
    rules: [
      { id: 1, title: "Respect Others", desc: "Treat staff and fellow members with respect. Avoid inappropriate behavior or language." },
      { id: 2, title: "Time Limits", desc: "Be mindful of time on equipment, especially during peak hours." },
      { id: 3, title: "No Harassment", desc: "Any form of harassment or bullying is strictly prohibited." },
      { id: 4, title: "Personal Belongings", desc: "Use lockers for storage; avoid leaving bags or items in walkways." },
    ],
  },
  {
    category: "Personal Safety",
    rules: [
      { id: 5, title: "Warm-Up and Cool-Down", desc: "Always perform a proper warm-up and cool-down to prevent injuries." },
      { id: 6, title: "Use Proper Form", desc: "Avoid overexertion and prioritize correct technique when exercising. Seek help from staff if unsure." },
      { id: 7, title: "Start Light", desc: "Gradually increase weights or intensity to avoid injury." },
      { id: 8, title: "Avoid Overtraining", desc: "Listen to your body and take rest days as needed." },
      { id: 9, title: "Spotters", desc: "Use a spotter for heavy lifts like bench presses or squats." },
      { id: 10, title: "Stay Hydrated", desc: "Drink water regularly to avoid dehydration." },
      { id: 11, title: "Secure Your Belongings", desc: "Keep valuables in lockers and avoid carrying them during workouts." },
      { id: 12, title: "Report Concerns", desc: "Immediately notify staff if you feel unwell, experience pain, or notice unsafe behavior or equipment." },
      { id: 13, title: "Avoid Late-Night Risks", desc: "If the gym is 24/7, avoid isolated areas when fewer people are around." },
    ],
  },
  {
    category: "Hygiene",
    rules: [
      { id: 14, title: "Wipe Down Equipment", desc: "Clean equipment after use with provided sanitizing wipes or spray." },
      { id: 15, title: "Proper Attire", desc: "Wear appropriate gym clothes and closed-toe athletic shoes." },
      { id: 16, title: "Towels", desc: "Bring a towel to place on benches or mats during workouts." },
      { id: 17, title: "Personal Hygiene", desc: "Maintain cleanliness and avoid strong fragrances." },
    ],
  },
  {
    category: "Equipment Usage",
    rules: [
      { id: 18, title: "Re-Rack Weights", desc: "Return weights, dumbbells, and other equipment to their designated places after use." },
      { id: 19, title: "No Hoarding", desc: "Avoid monopolizing multiple machines or equipment." },
      { id: 20, title: "Keep It Clean", desc: "Avoid dropping weights unnecessarily to prevent damage and noise." },
      { id: 21, title: "Cardio Machines", desc: "Limit time to 30 minutes during busy hours." },
    ],
  },
  {
    category: "Membership & Access",
    rules: [
      { id: 22, title: "Check-In", desc: "Always check in with your membership card or app." },
      { id: 23, title: "Non-Transferable Membership", desc: "Do not share your membership with others." },
      { id: 24, title: "Guest Policy", desc: "Follow the gym's guidelines for bringing guests." },
      { id: 25, title: "Payments", desc: "Ensure timely payment of membership dues." },
    ],
  },
  {
    category: "Prohibited Activities",
    rules: [
      { id: 26, title: "No Smoking or Alcohol", desc: "Smoking, alcohol, or drugs are strictly prohibited on gym premises." },
      { id: 27, title: "No Food or Drinks", desc: "Only water or sports drinks in closed containers are allowed." },
      { id: 28, title: "Footwear Policy", desc: "Outside shoes are not allowed in gym so please keep one extra pair of clean gym shoes." },
      { id: 29, title: "Children", desc: "Children under the specified age are not allowed unless in supervised programs." },
      { id: 30, title: "Pets", desc: "Pets are not permitted, except for service animals." },
    ],
  },
  {
    category: "Emergency Preparedness",
    rules: [
      { id: 31, title: "Know Emergency Exits", desc: "Familiarize yourself with emergency exits and procedures." },
      { id: 32, title: "First Aid", desc: "Report injuries or accidents to staff immediately for assistance." },
      { id: 33, title: "Emergency Contacts", desc: "Ensure the gym has your updated emergency contact information." },
    ],
  },
];

export function GymRulesModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-4 font-medium transition-colors"
        >
          <FileText className="mr-1 h-3 w-3" /> View GV Fitness Gym Rules & Regulations
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <ShieldAlert className="h-5 w-5 text-emerald-400" />
            GV FITNESS, RECREATION AND CULTURAL RESOURCES
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            201, 201a, Sai Vittorio, Bhimrad-althan Rd, Opp. Atlanta Shopping Mall, Surat, Gujarat 395017
          </p>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-3 space-y-5 text-sm">
          <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            Hours: Mon–Saturday: 6:00am to 10:30pm | Sunday: 8:00am to 12:00pm
          </p>

          {GYM_RULES_SECTIONS.map((section) => (
            <div key={section.category} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {section.category}
              </h4>
              <ul className="space-y-1.5 pl-2 text-xs text-muted-foreground">
                {section.rules.map((rule) => (
                  <li key={rule.id} className="leading-relaxed">
                    <strong className="text-foreground">{rule.title}: </strong>
                    {rule.desc}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
