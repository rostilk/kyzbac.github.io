/*
  EDIT YOUR PRICING HERE.
  Prices are intentionally set to "Custom quote" until you choose your own rates.
  You can use values such as "From $50" or "€40–€80" when you are ready.
*/
window.PRICING_CONFIG = {
  currency: "USD",
  packages: [
    {
      id: "feature",
      number: "01",
      name: "Feature or fix",
      price: "Custom quote",
      summary: "A focused task inside an existing Roblox experience.",
      details: "Best for a contained mechanic, UI interaction, bug investigation, or targeted optimization task.",
      includes: ["Scope review before work", "Implementation of the agreed task", "Testing and handoff notes"],
      featured: false
    },
    {
      id: "system",
      number: "02",
      name: "Custom system",
      price: "Custom quote",
      summary: "A complete gameplay or player-facing system built around your project.",
      details: "Best for combat, inventory, NPC behavior, matchmaking, customization, dialogue, and other multi-part systems.",
      includes: ["System structure and implementation", "Integration with your existing project", "Testing and agreed refinements"],
      featured: true
    },
    {
      id: "tooling",
      number: "03",
      name: "Tools and ongoing work",
      price: "Custom quote",
      summary: "Developer tools, Studio plugins, or continued development support.",
      details: "Best for workflow automation, custom plugins, maintenance, optimization, or a sequence of related tasks.",
      includes: ["Requirements and technical review", "Agreed milestones and priorities", "Handoff or ongoing support plan"],
      featured: false
    }
  ]
};
