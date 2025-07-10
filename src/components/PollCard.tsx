import { Poll } from "../pages/PollList";
import { Link } from "react-router-dom";

const PollCard = ({ poll }: { poll: Poll }) => {
  return (
    <Link
      to={`/poll/${poll.id}`}
      className="block p-4 border rounded hover:bg-gray-50 transition"
    >
      <h3 className="text-lg font-semibold">{poll.question}</h3>
      <p className="text-sm text-gray-500">
        Options: {poll.options.length} • Ends:{" "}
        {poll.ends_at ? new Date(poll.ends_at).toLocaleString() : "Never"}
      </p>
    </Link>
  );
};

export default PollCard;
