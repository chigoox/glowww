// Removed NextUI usage; using plain HTML inputs
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { CollapsibleSection } from "@/app/HomePage/BookingInfo";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const AvailabilitySelector = ({ setData }) => {
  const [availability, setAvailability] = useState({});

  useEffect(() => {
    setData((old) => ({ ...old, availability }));
  }, [availability]);

  const handleTimeChange = (day, type, value) => {
    setAvailability((prev) => ({
      ...prev, 
      [day]: {
        ...prev[day],
        [type]: value,
      },
    }));
  };


  return (
    <div className="mx-auto my-5 max-w-4xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <CollapsibleSection title="Set Your Availability">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {daysOfWeek.map((day) => (
              <motion.div
                key={day}
                className="w-full border rounded-md p-3 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="font-bold mb-2">{day}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-600">Start Time</label>
                    <input
                      type="time"
                      className="w-full border rounded px-2 py-1"
                      onChange={(e) => handleTimeChange(day, "startTime", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-600">End Time</label>
                    <input
                      type="time"
                      className="w-full border rounded px-2 py-1"
                      onChange={(e) => handleTimeChange(day, "endTime", e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CollapsibleSection>
      </motion.div>
    </div>
  );
};

export default AvailabilitySelector;