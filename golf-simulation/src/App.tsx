
import './App.css';
import { useSimulation } from './hooks/useSimulation';
import { ControlPanel } from './components/ControlPanel';
import { SimulationCanvas } from './components/SimulationCanvas';

function App() {
  const simulation = useSimulation();

  return (
    <div className="app-container">
      <ControlPanel 
        params={simulation.params}
        setParams={simulation.setParams}
        isPlaying={simulation.isPlaying}
        togglePlay={simulation.togglePlay}
        reset={simulation.reset}
        currentTime={simulation.currentTime}
        simulationResult={simulation.simulationResult}
      />
      <SimulationCanvas 
        simulationResult={simulation.simulationResult}
        currentRealPoint={simulation.currentRealPoint}
        currentIdealPoint={simulation.currentIdealPoint}
        isPlaying={simulation.isPlaying}
        spinRate={simulation.params.spinRate}
        currentTime={simulation.currentTime}
      />
    </div>
  );
}

export default App;
