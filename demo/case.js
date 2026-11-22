/* Synthetic observations for a desk exercise. Quotations are fictional. */
export const fieldStops = [
  {
    id: "crossing",
    owner: "Floor supervisor",
    name: "Marked crossing",
    ref: "A",
    question: "Where do pedestrians cross the vehicle aisle?",
    day: {
      time: "07:40",
      source: "EHS observation",
      note: "During the inbound wave, four people used the marked crossing. The gate opened onto the marked walkway each time.",
    },
    night: {
      time: "21:45",
      source: "Night shift lead",
      note: "Two pickers used the marked crossing during the first dispatch wave. The lead did not observe the later changeover.",
    },
  },
  {
    id: "staging",
    owner: "Dispatch lead",
    name: "Pallet staging",
    ref: "B",
    question: "Does the pedestrian route remain clear as loads change?",
    day: {
      time: "07:50",
      source: "Receiving operator",
      note: "The staging bay was half full. I could walk from the receiving door to the crossing without entering the vehicle aisle.",
    },
    night: {
      time: "21:55",
      source: "Dispatch operator",
      note: "Returns occupied the end of the marked walkway during dispatch. I reported the obstruction and the supervisor held movements in that area.",
      exception: true,
    },
  },
  {
    id: "desk",
    owner: "Handover coordinator",
    name: "Dispatch desk",
    ref: "C",
    question: "What gets passed between shifts?",
    day: {
      time: "08:00",
      source: "Day handover sheet",
      note: "The day team recorded the new crossing and its location. The handover sheet has no entry for the evening dispatch wave.",
    },
    night: {
      time: "22:05",
      source: "Dispatch radio log",
      note: "The supervisor acknowledged a staging call during the dispatch wave. The radio log does not contain a field check of the route after the call.",
    },
  },
];
