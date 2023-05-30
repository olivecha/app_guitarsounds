import os
import numpy as np

def get_file_number(filename):
    """ get the number in a filename """
    numbers = []
    for char in filename:
        try:
            numbers.append(int(char))
        except:
            pass 
    numbers = [str(num) for num in numbers]
    return int(''.join(numbers))

def get_temp_sound_number():
    """ 
    Get the current temp sound number 
    """
    numbers = []
    for filename in os.listdir('temp_sounds'):
        numbers.append(get_file_number(filename))

    if len(numbers) == 0:
        return 0
    else:
        return np.sort(numbers)[-1] + 1

#def display(spectrogram, format):
#    plt.figure(figsize=(10, 4))
#    librosa.display.specshow(spectrogram, y_axis='mel', x_axis='time')
#    plt.title('Mel-frequency spectrogram')
#    plt.colorbar(format=format)
#    plt.tight_layout()
#    st.pyplot(clear_figure=False)

