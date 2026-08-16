const dimensions = [
  { id: "mental_demand", label: "Mental Demand", question: "How much mental and perceptual activity was required?" },
  { id: "physical_demand", label: "Physical Demand", question: "How much physical activity was required?" },
  { id: "temporal_demand", label: "Temporal Demand", question: "How much time pressure did you feel due to the pace?" },
  { id: "performance", label: "Performance", question: "How successful do you think you were in accomplishing your goals?" },
  { id: "effort", label: "Effort", question: "How hard did you have to work to achieve your level of performance?" },
  { id: "frustration", label: "Frustration Level", question: "How irritated, stressed, or annoyed did you feel?" },
];

const pairs = dimensions.flatMap((left, index) => dimensions.slice(index + 1).map((right) => [left, right]));
const ratings = Object.fromEntries(dimensions.map(({ id }) => [id, null]));
const choices = {};
const participantInput = document.querySelector("#participantId");
const ratingFields = document.querySelector("#ratingFields");
const pairwiseFields = document.querySelector("#pairwiseFields");
const pairwiseSection = document.querySelector("#pairwiseSection");
const score = document.querySelector("#score");
const scoreLabel = document.querySelector("#scoreLabel");
const resultDetail = document.querySelector("#resultDetail");
const validationMessage = document.querySelector("#validationMessage");

const initialParticipant = new URLSearchParams(window.location.search).get("participant");
if (initialParticipant) participantInput.value = initialParticipant;

ratingFields.innerHTML = dimensions.map(({ id, label, question }) => `
  <label class="rating-field" for="${id}">
    <span class="rating-label">${label}</span>
    <span class="rating-question">${question}</span>
    <span class="slider-row"><input id="${id}" data-rating="${id}" type="range" min="0" max="100" step="5" value="50" aria-describedby="${id}Value" /><output id="${id}Value" class="rating-value">—</output></span>
    <span class="slider-scale" aria-hidden="true"><span>0</span><span>100</span></span>
  </label>`).join("");

pairwiseFields.innerHTML = pairs.map(([left, right], index) => `
  <fieldset class="pair" data-pair="${index}">
    <legend>${index + 1}. Which contributed more to workload?</legend>
    <div class="pair-options">
      <button type="button" data-pair="${index}" data-choice="${left.id}">${left.label}</button>
      <span>or</span>
      <button type="button" data-pair="${index}" data-choice="${right.id}">${right.label}</button>
    </div>
  </fieldset>`).join("");

function mode() { return document.querySelector('input[name="mode"]:checked').value; }
function paintSlider(input, value) {
  input.style.background = `linear-gradient(90deg, var(--accent) 0 ${value}%, #d9e2dd ${value}% 100%)`;
}
function ratingsComplete() { return dimensions.every(({ id }) => Number.isFinite(ratings[id]) && ratings[id] >= 0 && ratings[id] <= 100); }
function weights() {
  const tally = Object.fromEntries(dimensions.map(({ id }) => [id, 0]));
  Object.values(choices).forEach((id) => { tally[id] += 1; });
  return tally;
}
function calculate() {
  const selectedMode = mode();
  const complete = ratingsComplete();
  const selectedPairs = Object.keys(choices).length;
  pairwiseSection.classList.toggle("hidden", selectedMode !== "weighted");
  scoreLabel.textContent = selectedMode === "weighted" ? "Weighted workload score" : "Raw workload score";
  document.querySelector("#pairwiseProgress").textContent = `${selectedPairs} of 15 selected`;
  if (!complete) {
    score.value = "—";
    resultDetail.textContent = "Enter all six ratings to calculate the score.";
    return null;
  }
  const raw = dimensions.reduce((sum, { id }) => sum + ratings[id], 0) / dimensions.length;
  if (selectedMode === "raw") {
    score.value = raw.toFixed(2);
    resultDetail.textContent = "Calculated as the mean of the six ratings.";
    return { raw, weighted: null, weights: null };
  }
  if (selectedPairs !== pairs.length) {
    score.value = "—";
    resultDetail.textContent = `Choose all 15 pairs to calculate the weighted score (${selectedPairs} completed).`;
    return { raw, weighted: null, weights: null };
  }
  const tally = weights();
  const weighted = dimensions.reduce((sum, { id }) => sum + ratings[id] * tally[id], 0) / pairs.length;
  score.value = weighted.toFixed(2);
  resultDetail.textContent = `Pairwise weights total ${Object.values(tally).reduce((sum, value) => sum + value, 0)} of 15.`;
  return { raw, weighted, weights: tally };
}

document.addEventListener("input", (event) => {
  const id = event.target.dataset.rating;
  if (!id) return;
  const value = Number(event.target.value);
  ratings[id] = event.target.value === "" || !Number.isFinite(value) ? null : value;
  document.querySelector(`#${id}Value`).value = value;
  paintSlider(event.target, value);
  calculate();
});
document.querySelectorAll('input[name="mode"]').forEach((input) => input.addEventListener("change", calculate));
pairwiseFields.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-choice]");
  if (!button) return;
  choices[button.dataset.pair] = button.dataset.choice;
  document.querySelectorAll(`button[data-pair="${button.dataset.pair}"]`).forEach((item) => item.classList.toggle("selected", item === button));
  calculate();
});

function csvEscape(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
document.querySelector("#downloadButton").addEventListener("click", () => {
  validationMessage.textContent = "";
  const participant = participantInput.value.trim();
  const calculated = calculate();
  if (!participant) { validationMessage.textContent = "Enter a participant ID before downloading."; participantInput.focus(); return; }
  if (!ratingsComplete()) { validationMessage.textContent = "Enter a rating from 0 to 100 for all six dimensions before downloading."; return; }
  if (mode() === "weighted" && Object.keys(choices).length !== pairs.length) { validationMessage.textContent = "Choose one contributor for every pair before downloading the weighted record."; return; }
  const row = {
    timestamp_iso: new Date().toISOString(), participant_id: participant, scoring_method: mode(),
    raw_nasa_tlx: calculated.raw.toFixed(2), weighted_nasa_tlx: calculated.weighted?.toFixed(2) ?? "",
    ...Object.fromEntries(dimensions.map(({ id }) => [`${id}_rating`, ratings[id]])),
    ...Object.fromEntries(dimensions.map(({ id }) => [`${id}_weight`, calculated.weights?.[id] ?? ""])),
  };
  const csv = `${Object.keys(row).join(",")}\n${Object.values(row).map(csvEscape).join(",")}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = `nasa-tlx_${participant.replaceAll(/[^a-z0-9_-]/gi, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click(); URL.revokeObjectURL(url);
});

calculate();
