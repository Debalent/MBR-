import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';

const VisualizerContainer = styled.div`
  width: 100%;
  height: 80px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  background: transparent;
`;

const NoAudioMessage = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
`;

const AudioVisualizer = ({ isPlaying, audioContext, analyser }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    if (analyser && audioContext) {
      setHasAudio(true);
      draw();
    } else {
      setHasAudio(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, audioContext, isPlaying]);

  const draw = () => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      if (!isPlaying) {
        // Draw static bars when not playing
        ctx.clearRect(0, 0, width, height);
        drawStaticBars(ctx, width, height);
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#ff6b35');
      gradient.addColorStop(0.5, '#f7931e');
      gradient.addColorStop(1, '#ffca28');

      const barWidth = width / bufferLength * 2.5;
      let barHeight;
      let x = 0;

      // Draw frequency bars
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8;

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        // Add glow effect
        ctx.shadowColor = '#ff6b35';
        ctx.shadowBlur = 10;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        ctx.shadowBlur = 0;

        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const drawStaticBars = (ctx, width, height) => {
    const barCount = 64;
    const barWidth = width / barCount;
    
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, 'rgba(255, 107, 53, 0.3)');
    gradient.addColorStop(0.5, 'rgba(247, 147, 30, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 202, 40, 0.3)');

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.random() * height * 0.3 + 5;
      const x = i * barWidth;

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    }
  };

  if (!hasAudio) {
    return (
      <VisualizerContainer>
        <NoAudioMessage>
          🎵 Audio visualizer will appear when music is playing
        </NoAudioMessage>
      </VisualizerContainer>
    );
  }

  return (
    <VisualizerContainer>
      <Canvas ref={canvasRef} width={800} height={80} />
    </VisualizerContainer>
  );
};

export default AudioVisualizer;