import time, os
import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
from src.sound import sound
from guitarsounds.utils import load_wav
from guitarsounds.analysis import Sound
from app_utils import get_file_number, get_temp_sound_number

DURATION = 3
WAVE_OUTPUT_FILE = 'temp.wav'

#""" 
#Session setup
#"""
# Cleared the saved sounds in the cache
if 'temp_cleared' not in st.session_state:
    for filename in os.listdir('temp_sounds/'):
        os.remove('temp_sounds/' + filename)
    st.session_state['temp_cleared'] = True

if 'upload_status' not in st.session_state:
    st.session_state['upload_status'] = None

def update_file_load_status():
    st.session_state['upload_status'] = True

def delete_sound(filename):
    os.remove(filename)

title = "Guitarsound: analyse comparative de sons de guitare"
st.title(title)
sounds_io, analysis = st.tabs(["Ajouter des sons", "Analyser des sons"])

with sounds_io: 
    col1, col2 = st.columns([1, 1])
    col1.write('')
    col2.write('')
    
    if col1.button('Enregistrer un son',
                   use_container_width=True):
        with st.spinner(f'Enregistrement durant {DURATION} secondes ....'):
            sound.record()
        new_sound = Sound('temp.wav')
        sound_number = get_temp_sound_number()
        temp_save_path = f'temp_sounds/sound{sound_number}'
        new_sound.signal.save_wav(temp_save_path)
    
    expander = col2.expander("Téléverser un son")
    uploaded_file = expander.file_uploader("Choose a file", 
                                       type=['wav'], 
                                       on_change=update_file_load_status,
                                       label_visibility='collapsed')
    
    if uploaded_file is not None and st.session_state['upload_status']:
        sigarray, sr = load_wav(uploaded_file)
        new_sound = Sound((sigarray, sr))
        sound_number = get_temp_sound_number()
        temp_save_path = f'temp_sounds/sound{sound_number}'
        print(temp_save_path, 'upload')
        new_sound.signal.save_wav(temp_save_path)
        st.session_state['upload_status'] = False
    
    col3, col4, col5, colx = st.columns([2, 2, 1, 0.5])
    sounds = []
    names = []
    
    for filename in np.sort(os.listdir('temp_sounds/')):
        number = get_file_number(filename)
        sound = Sound('temp_sounds/' + filename)
        sounds.append(sound)
    
        colx.write(' ')
        colx.button(label=':wastebasket:', 
                    key=f'del_{number}',
                    on_click=delete_sound,
                    args=('temp_sounds/' + filename,))
        col3.write(' ')
        col5.write(' ')
        name = col3.text_input(f'name_{number}', 
                               'Nom du son', 
                               label_visibility='collapsed')
        names.append(name)
        col4.audio(sound.signal.signal, sample_rate=sound.signal.sr)
        col5.download_button(label='Télécharger', 
                             data=open('temp_sounds/' + filename, 'rb'),
                             file_name=f'mon_son_{number}.wav')

with analysis:
    # sound.play()
    st.write(names)

#if st.button('Classify'):
#    cnn = init_model()
#    with st.spinner("Classifying the chord"):
#        chord = cnn.predict(WAVE_OUTPUT_FILE, False)
#    st.success("Classification completed")
#    st.write("### The recorded chord is **", chord + "**")
#    if chord == 'N/A':
#        st.write("Please record sound first")
#    st.write("\n")

# Add a placeholder
#if st.button('Display Spectrogram'):
#    # type = st.radio("Scale of spectrogram:",
#    #                 ('mel', 'DB'))
#    if os.path.exists(WAVE_OUTPUT_FILE):
#        spectrogram, format = get_spectrogram(type='mel')
#        display(spectrogram, format)
#    else:
#        st.write("Please record sound first")

