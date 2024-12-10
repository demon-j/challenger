import PropTypes from "prop-types";

function App() {
  return <div>Hello World</div>;
}

App.propTypes = {
  headline: PropTypes.string,
  showLogos: PropTypes.string,
  backgroundImage: PropTypes.string,
};

App.defaultProps = {
  headline: "Hello World",
  showLogos: true,
  backgroundImage: "",
};

export default App;
