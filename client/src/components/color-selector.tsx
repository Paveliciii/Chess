import { RadioGroup } from '@/components/ui/radio-group';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SunIcon, MoonIcon, ShuffleIcon } from 'lucide-react';

interface ColorSelectorProps {
  selectedColor: 'white' | 'black' | 'random';
  onColorChange: (color: 'white' | 'black' | 'random') => void;
}

export function ColorSelector({ selectedColor, onColorChange }: ColorSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Выберите цвет</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedColor}
          onValueChange={(value) => onColorChange(value as 'white' | 'black' | 'random')}
          className="flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2 rounded-md border p-2 hover:bg-gray-100">
            <RadioGroupItem value="white" id="white" />
            <Label htmlFor="white" className="flex items-center cursor-pointer">
              <SunIcon className="mr-2 h-4 w-4 text-yellow-500" />
              <span>Белые</span>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 rounded-md border p-2 hover:bg-gray-100">
            <RadioGroupItem value="black" id="black" />
            <Label htmlFor="black" className="flex items-center cursor-pointer">
              <MoonIcon className="mr-2 h-4 w-4 text-gray-700" />
              <span>Черные</span>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 rounded-md border p-2 hover:bg-gray-100">
            <RadioGroupItem value="random" id="random" />
            <Label htmlFor="random" className="flex items-center cursor-pointer">
              <ShuffleIcon className="mr-2 h-4 w-4 text-purple-500" />
              <span>Случайно</span>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
