import Room from "./room";
import dispatch from "../data/dispatch.json";

export const revalidate = 60;

export default function Page() {
  return <Room dispatch={dispatch} />;
}
