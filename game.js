const playerName = localStorage.getItem('metroPlayerName');
const playerNameDisplay = document.querySelector('#player-name-display');

if (playerNameDisplay) {
  playerNameDisplay.textContent = playerName || 'Játékos';
}

const timerDisplay = document.querySelector('#timer-display');
let elapsedSeconds = 0;

function startTimer() {
  timerDisplay.textContent = `Idő: ${elapsedSeconds}s`;
  gameState.timerInterval = setInterval(() => {
    elapsedSeconds = elapsedSeconds + 1;
    timerDisplay.textContent = `Idő: ${elapsedSeconds}s`;
  }, 1000);
}

const gameState = {
  totalScore: 0,         
  ppScore: 0,            
  allVisitedStationIds: new Set(), 
  drawnSegments: new Set(), 
  drawnSegmentCoords: [], 
  currentLineIndex: 0,    
  cardsDrawnThisRound: 0, 
  timerInterval: null,    
  
  fullDeck: [ 
    { type: 'A', platform: 'middle' }, { type: 'A', platform: 'middle' },
    { type: 'B', platform: 'middle' }, { type: 'B', platform: 'middle' },
    { type: 'C', platform: 'middle' }, { type: 'C', platform: 'middle' },
    { type: 'D', platform: 'middle' }, { type: 'D', platform: 'middle' },
    { type: '?', platform: 'middle' },
    { type: 'A', platform: 'side' }, { type: 'A', platform: 'side' },
    { type: 'B', platform: 'side' }, { type: 'B', platform: 'side' },
    { type: 'C', platform: 'side' }, { type: 'C', platform: 'side' },
    { type: 'D', platform: 'side' }, { type: 'D', platform: 'side' },
    { type: '?', platform: 'side' } 
  ],
  
  shuffledDeck: [], 
  currentCard: null,
  currentLine: null,
  allLines: [],     
  allStations: []   
};

const actionButton = document.querySelector('#action-button');
const cardValueDisplay = document.querySelector('#card-value');
const currentLineDisplay = document.querySelector('#current-line-display');
const boardContainer = document.querySelector('#game-board-container');
const svgCanvas = document.querySelector('#line-canvas');
const ppScoreDisplay = document.querySelector('#pp-score-display');

async function loadStations() {
  try {
    const response = await fetch('stations.json');
    if (!response.ok) throw new Error(`HTTP hiba! Státusz: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Hiba az állomások betöltése közben:', error);
    return [];
  }
}

async function loadLines() {
  try {
    const response = await fetch('lines.json');
    if (!response.ok) throw new Error(`HTTP hiba! Státusz: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Hiba a vonalak betöltése közben:', error);
    return [];
  }
}

function drawGameBoard(stations) {
  stations.forEach(station => {
    const stationElement = document.createElement('div');
    stationElement.classList.add('station');
    stationElement.classList.add(`station-type-${station.type}`); 
    stationElement.id = `station-${station.id}`;
    
    stationElement.style.gridColumnStart = station.x + 1;
    stationElement.style.gridRowStart = station.y + 1;
    stationElement.textContent = station.type;
    
    stationElement.addEventListener('click', () => onStationClick(station.id));
    
    boardContainer.appendChild(stationElement);
  });
}

function highlightStartStations(lines) { 
  lines.forEach(line => {
    const startStationElement = document.querySelector(`#station-${line.start}`);
    if (startStationElement) {
      startStationElement.style.backgroundColor = line.color;
      startStationElement.style.color = 'white'; 
    }
  });
}

function drawCard() {
  gameState.cardsDrawnThisRound = gameState.cardsDrawnThisRound + 1;
  console.log(`Húzott kártyák ebben a körben: ${gameState.cardsDrawnThisRound}`);

  if (gameState.shuffledDeck.length === 0) {
    cardValueDisplay.textContent = 'ELFOGYOTT';
    actionButton.disabled = true;
    return;
  }
  
  const card = gameState.shuffledDeck.pop();
  gameState.currentCard = card;
  
  const platformIcon = (card.platform === 'middle') ? '▣' : '□';
  cardValueDisplay.textContent = `${platformIcon} ${card.type}`;
  
  actionButton.textContent = 'Passz (Eldobás)';
}

function onPassClick() {
  console.log('Játékos passzolt.');
  
  gameState.currentCard = null;
  cardValueDisplay.textContent = '-';
  actionButton.textContent = 'Kártyahúzás';
  
  if (gameState.cardsDrawnThisRound >= 8) { //
    console.log('Passz a 8. kártya után, forduló vége.');
    endCurrentRound();
  }
}

function onActionButtonClick() {
  if (gameState.currentCard === null) {
    drawCard();
  } else {
    onPassClick();
  }
}

function onStationClick(clickedStationId) {
  if (gameState.currentCard === null) {
    console.warn('Építéshez előbb húzz egy kártyát!');
    return;
  }
  
  if (clickedStationId === gameState.currentLine.lastStationId) {
    console.warn('Nem léphetsz önmagadba.');
    return;
  }
  if (gameState.currentLine.visitedStations.includes(clickedStationId)) {
    console.warn('Hurok! Ezen az állomáson már járt ez a vonal.');
    return;
  }

  const targetStation = gameState.allStations.find(s => s.id === clickedStationId);
  const startStation = gameState.allStations.find(s => s.id === gameState.currentLine.lastStationId);

  if (!targetStation || !startStation) {
    console.error('Hiba: Az állomásadatok nem találhatók!');
    return;
  }
  
  const id1 = Math.min(startStation.id, targetStation.id);
  const id2 = Math.max(startStation.id, targetStation.id);
  const segmentKey = `${id1}-${id2}`;
  if (gameState.drawnSegments.has(segmentKey)) {
    console.warn('Párhuzamos szakasz! Ezt a szakaszt már megrajzolta egy vonal.');
    return;
  }
  
  const newSegmentStart = { x: startStation.x, y: startStation.y };
  const newSegmentEnd = { x: targetStation.x, y: targetStation.y };

  for (const existingSegment of gameState.drawnSegmentCoords) {
    if (doSegmentsIntersect(newSegmentStart, newSegmentEnd, existingSegment.start, existingSegment.end)) {
      const isSharingEndpoint = 
        pointsAreEqual(newSegmentStart, existingSegment.start) ||
        pointsAreEqual(newSegmentStart, existingSegment.end) ||
        pointsAreEqual(newSegmentEnd, existingSegment.start) ||
        pointsAreEqual(newSegmentEnd, existingSegment.end);

      const o1 = orientation(newSegmentStart, newSegmentEnd, existingSegment.start);
      const o2 = orientation(newSegmentStart, newSegmentEnd, existingSegment.end);
      const areCollinear = (o1 === 0 && o2 === 0);

      if (!isSharingEndpoint || (isSharingEndpoint && areCollinear && onSegment(newSegmentStart, existingSegment.start, newSegmentEnd))) {
         console.warn('Szakaszkereszteződés vagy fedés! A lépés érvénytelen.');
         return;
      }
    }
  }

  const isCardJoker = gameState.currentCard.type === '?'; 
  const isStationJoker = targetStation.type === '?'; 
  const isTypeMatch = targetStation.type === gameState.currentCard.type;

  if (!isCardJoker && !isStationJoker && !isTypeMatch) {
    console.warn(`Rossz állomás típus! Kártya: ${gameState.currentCard.type}, Cél: ${targetStation.type}`);
    return;
  }
  
  const dx = Math.abs(targetStation.x - startStation.x);
  const dy = Math.abs(targetStation.y - startStation.y);
  const isSegmentValid = (dx > 0 && dy === 0) || (dx === 0 && dy > 0) || (dx === dy);
  if (!isSegmentValid) {
    console.warn('Érvénytelen lépés! Csak 90 vagy 45 fokos szakasz építhető.');
    return;
  }

  if (isSegmentPassingThroughStation(startStation, targetStation)) {
    return; 
  }
  
  console.log('ÉRVÉNYES LÉPÉS! Rajzolás...');
  
  drawSegment(startStation, targetStation, gameState.currentLine.color);
  
  gameState.drawnSegments.add(segmentKey);
  gameState.drawnSegmentCoords.push({ start: newSegmentStart, end: newSegmentEnd });
  
  gameState.currentLine.lastStationId = targetStation.id;
  gameState.currentLine.visitedStations.push(targetStation.id);
  
  if (!gameState.allVisitedStationIds.has(targetStation.id)) {
    gameState.allVisitedStationIds.add(targetStation.id);
    if (targetStation.train === true) { //
      gameState.ppScore = gameState.ppScore + 1;
      ppScoreDisplay.textContent = `Pályaudvarok (PP): ${gameState.ppScore}`;
    }
  }

  gameState.currentCard = null;
  cardValueDisplay.textContent = '-';
  actionButton.textContent = 'Kártyahúzás';
  const targetElement = document.querySelector(`#station-${targetStation.id}`);
  if (targetElement) {
    targetElement.style.backgroundColor = gameState.currentLine.color;
    targetElement.style.color = 'white';
  }
  
  if (gameState.cardsDrawnThisRound >= 8) {
    console.log('Építés a 8. kártya után, forduló vége.');
    endCurrentRound();
  }
}

function calculateRoundScore() {
  const line = gameState.currentLine;
  const visitedIds = line.visitedStations || []; 
  const visitedStationsData = visitedIds
    .map(id => gameState.allStations.find(s => s.id === id))
    .filter(s => s);

  if (visitedStationsData.length < 2) return 0;
    
  const districts = new Set(visitedStationsData.map(s => s.district));
  const PK = districts.size;

  const districtCounts = {};
  visitedStationsData.forEach(s => {
    districtCounts[s.district] = (districtCounts[s.district] || 0) + 1;
  });
  const PM = Math.max(0, ...Object.values(districtCounts));

  let PD = 0;
  for (let i = 0; i < visitedStationsData.length - 1; i++) {
    const stationA = visitedStationsData[i];
    const stationB = visitedStationsData[i+1];
    if (stationA.side !== stationB.side) { //
      PD = PD + 1;
    }
  }

  const FP = (PK * PM) + PD;
  console.log(`Forduló pontszám (${line.name}): PK=${PK}, PM=${PM}, PD=${PD} => FP = ${FP}`);
  return FP;
}

function endCurrentRound() {
  console.log(`VÉGE A FORDULÓNAK: ${gameState.currentLine.name}`);
  
  const roundScore = calculateRoundScore();
  gameState.totalScore = gameState.totalScore + roundScore;
  console.log(`Aktuális összpontszám: ${gameState.totalScore}`);
  
  actionButton.disabled = true;
  actionButton.textContent = 'Következő forduló...';
  
  gameState.currentLineIndex = gameState.currentLineIndex + 1;
  
  if (gameState.currentLineIndex >= gameState.allLines.length) {
    endGame(); 
  } else {
    setTimeout(() => {
      startNewRound();
    }, 1500);
  }
}

function startNewRound() {
  if (gameState.currentLineIndex >= gameState.allLines.length) {
    endGame(); 
    return;
  }

  gameState.currentLine = gameState.allLines[gameState.currentLineIndex];
  currentLineDisplay.textContent = `Aktuális vonal: ${gameState.currentLine.name}`;
  currentLineDisplay.style.color = gameState.currentLine.color;
  
  shuffleDeck(); 
  
  gameState.cardsDrawnThisRound = 0;
  gameState.currentCard = null;
  
  cardValueDisplay.textContent = '-';
  actionButton.textContent = 'Kártyahúzás';
  actionButton.disabled = false;
  
  const startStationId = gameState.currentLine.start;
  gameState.currentLine.lastStationId = startStationId;
  gameState.currentLine.visitedStations = [startStationId];

  if (!gameState.allVisitedStationIds.has(startStationId)) {
    gameState.allVisitedStationIds.add(startStationId);
    
    const startStation = gameState.allStations.find(s => s.id === startStationId);
    if (startStation && startStation.train === true) { //
      gameState.ppScore = gameState.ppScore + 1; 
      ppScoreDisplay.textContent = `Pályaudvarok (PP): ${gameState.ppScore}`;
    }
  }
  
  console.log(`Új forduló: ${gameState.currentLine.name}, kezdőállomás: ${startStationId}`);
}

function saveGameResult(finalScore) {
  const playerName = localStorage.getItem('metroPlayerName') || 'Játékos';
  const time = elapsedSeconds;
  
  console.log(`Eredmény mentése: ${playerName}, ${finalScore} pont, ${time}s`);

  const highScores = JSON.parse(localStorage.getItem('metroHighScores')) || [];

  const newResult = {
    name: playerName,
    score: finalScore,
    time: time
  };
  highScores.push(newResult);

  highScores.sort((a, b) => b.score - a.score);

  localStorage.setItem('metroHighScores', JSON.stringify(highScores));
}

function endGame() {
  console.log('JÁTÉK VÉGE! Végső pontszámítás...');
  clearInterval(gameState.timerInterval);
  
  const stationVisitCounts = {}; 
  gameState.allLines.forEach(line => {
    const uniqueIdsThisLine = new Set(line.visitedStations || []);
    uniqueIdsThisLine.forEach(stationId => {
      stationVisitCounts[stationId] = (stationVisitCounts[stationId] || 0) + 1;
    });
  });

  let P2 = 0, P3 = 0, P4 = 0;
  Object.values(stationVisitCounts).forEach(count => {
    if (count === 2) P2++;
    else if (count === 3) P3++;
    else if (count === 4) P4++;
  });

  const junctionScore = (2 * P2) + (5 * P3) + (9 * P4);
  const finalScore = gameState.totalScore + gameState.ppScore + junctionScore;
  
  console.log(`VÉGSŐ PONTSZÁM: ${finalScore}`);
    
  saveGameResult(finalScore);

  actionButton.disabled = true;
  actionButton.textContent = 'Játék vége';
  cardValueDisplay.textContent = 'VÉGE';
  currentLineDisplay.textContent = `Játék vége! Pontszám: ${finalScore}`;

  const backToMenuLink = document.createElement('a');
  backToMenuLink.href = 'index.html';
  backToMenuLink.textContent = 'Vissza a Főmenübe';
  backToMenuLink.style.marginTop = '20px';
  backToMenuLink.style.display = 'inline-block';
  
  const controlsDiv = document.querySelector('#controls');
  if(controlsDiv) {
    controlsDiv.appendChild(backToMenuLink);
  }
}

function shuffleDeck() {
  const deckToShuffle = [...gameState.fullDeck];
  let currentIndex = deckToShuffle.length;
  let randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [deckToShuffle[currentIndex], deckToShuffle[randomIndex]] = [
      deckToShuffle[randomIndex], deckToShuffle[currentIndex]];
  }
  gameState.shuffledDeck = deckToShuffle;
}

function drawSegment(stationA, stationB, color) {
  const x1 = stationA.x * 60 + 30;
  const y1 = stationA.y * 60 + 30;
  const x2 = stationB.x * 60 + 30;
  const y2 = stationB.y * 60 + 30;

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', 8); 
  svgCanvas.appendChild(line);
}

function isSegmentPassingThroughStation(startStation, targetStation) {
  const dx = targetStation.x - startStation.x;
  const dy = targetStation.y - startStation.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  
  for (let i = 1; i < distance; i++) {
    const checkX = startStation.x + i * stepX;
    const checkY = startStation.y + i * stepY;
    const passingStation = gameState.allStations.find(s => s.x === checkX && s.y === checkY);
    if (passingStation) {
      console.warn(`Érvénytelen lépés: A szakasz áthaladna a(z) ${passingStation.id} ID-jú állomáson.`);
      return true;
    }
  }
  return false;
}

function pointsAreEqual(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
}

function onSegment(p, q, r) {
  return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
          q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y));
}

function orientation(p, q, r) {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 0.0001) return 0;
  return (val > 0) ? 1 : 2;
}

function doSegmentsIntersect(p1, q1, p2, q2) {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

async function initGame() {
    
  const [stations, lines] = await Promise.all([
      loadStations(),
      loadLines()    
  ]);
    
  gameState.allLines = lines;
  gameState.allStations = stations; 
  
  if (stations.length > 0) {
    drawGameBoard(stations);
  }
  
  if (lines.length > 0) {
    highlightStartStations(lines);
    startTimer(); 
    startNewRound();
  }
  
  actionButton.addEventListener('click', onActionButtonClick);
}

initGame();