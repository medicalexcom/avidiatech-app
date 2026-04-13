"use client";
import React from "react";

export default function MatchFilters() {
  return (
    <div>
      <label>Filter: </label>
      <select>
        <option>All</option>
        <option>High (≥0.90)</option>
        <option>Needs Review (0.70–0.89)</option>
        <option>No match</option>
        <option>Confirmed</option>
        <option>Rejected</option>
      </select>
    </div>
  );
}
