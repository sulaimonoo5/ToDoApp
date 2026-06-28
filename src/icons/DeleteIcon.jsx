import React from "react";
import { Trash2 } from "lucide-react";

function DeleteIcon({ className = "w-4 h-4" }) {
  return <Trash2 className={className} />;
}

export default DeleteIcon;
