import React from 'react';

interface AvatarProps {
  name: string;
  isUser: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ name, isUser }) => {
  const colors = ['#FFC107', '#03A9F4', '#4CAF50', '#F44336', '#9C27B0'];
  const firstLetter = name.charAt(0).toUpperCase();
  const colorIndex = firstLetter.charCodeAt(0) % colors.length;
  const marginClass = isUser ? 'ms-2' : 'me-2';

  const avatarStyle = {
    backgroundColor: colors[colorIndex],
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.2em',
  };

  return <div style={avatarStyle} className={marginClass}>{firstLetter}</div>;
};

export default Avatar;
