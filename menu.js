function displayHighScores() {
  const highScores = JSON.parse(localStorage.getItem('metroHighScores')) || [];
  const listElement = document.querySelector('#high-scores-list');

  if (!listElement) return;

  listElement.innerHTML = '';

  if (highScores.length === 0) {
    listElement.innerHTML = '<li>Még nincsenek mentett eredmények.</li>';
    return;
  }

  highScores.forEach(result => {
    const li = document.createElement('li');
    li.textContent = `${result.name} - ${result.score} pont (${result.time}s)`;
    listElement.appendChild(li);
  });
}

const startButton = document.querySelector('#start-game-button');
const playerNameInput = document.querySelector('#player-name-input');

if (startButton) {
  startButton.addEventListener('click', () => {
    const playerName = playerNameInput.value || 'Játékos';
    
    localStorage.setItem('metroPlayerName', playerName);
    
    window.location.href = 'game.html';
  });
}

displayHighScores();